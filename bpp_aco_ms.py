import random
import json
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class Box:
    length: float
    width: float
    height: float
    value: float
    weight: float
    id: int

@dataclass
class Position:
    x: float
    y: float
    z: float

@dataclass
class Space:
    x: float
    y: float
    z: float
    length: float
    width: float
    height: float

class Truck:
    def __init__(self, length: float, width: float, height: float, max_weight: float, id: int):
        self.length = length
        self.width = width
        self.height = height
        self.max_weight = max_weight
        self.id = id
        self.placed_boxes: List[Tuple[Box, Position]] = []
        self.spaces: List[Space] = [Space(0, 0, 0, length, width, height)]

    def can_place(self, box: Box, space: Space) -> bool:
        return (box.length <= space.length and
                box.width <= space.width and
                box.height <= space.height)

    def place_box(self, box: Box, pos: Position):
        self.placed_boxes.append((box, pos))

    def update_spaces(self, box: Box, pos: Position):
        for i, space in enumerate(self.spaces):
            if (abs(pos.x - space.x) < 0.001 and
                abs(pos.y - space.y) < 0.001 and
                abs(pos.z - space.z) < 0.001):
                self.spaces.pop(i)
                if pos.x + box.length < space.x + space.length:
                    self.spaces.append(Space(pos.x + box.length, pos.y, pos.z,
                                            space.length - box.length, space.width, space.height))
                if pos.y + box.width < space.y + space.width:
                    self.spaces.append(Space(pos.x, pos.y + box.width, pos.z,
                                            space.length, space.width - box.width, space.height))
                if pos.z + box.height < space.z + space.height:
                    self.spaces.append(Space(pos.x, pos.y, pos.z + box.height,
                                            space.length, space.width, space.height - box.height))
                break


def maximal_space_packing(truck: Truck, boxes: List[Box]) -> Tuple[float, List[Box]]:
    # Очищаем ранее размещённые коробки и задаём начальное пространство — весь объём фуры
    truck.placed_boxes = []
    truck.spaces = [Space(0, 0, 0, truck.length, truck.width, truck.height)]

    unplaced_boxes = []  # Список коробок, которые не удалось разместить с первой попытки
    # Сортировка коробок по длине по убыванию (длинные вперёд — проще заполнять объём)
    sorted_boxes = sorted(boxes, key=lambda b: b.length, reverse=True)

    total_weight = 0  # Суммарный вес загруженных коробок

    # Первая попытка размещения коробок
    for box in sorted_boxes:
        # Проверка ограничения по весу фуры
        if total_weight + box.weight <= truck.max_weight:
            placed = False
            # Перебор всех доступных свободных пространств в фуре
            for i, space in enumerate(truck.spaces):
                # Проверка, можно ли разместить коробку в текущем пространстве
                if truck.can_place(box, space):
                    pos = Position(space.x, space.y, space.z)
                    # Проверка на пересечение с уже размещёнными коробками
                    if all(not (pos.x < pb_pos.x + pb.length and pos.x + box.length > pb_pos.x and
                                pos.y < pb_pos.y + pb.width and pos.y + box.width > pb_pos.y and
                                pos.z < pb_pos.z + pb.height and pos.z + box.height > pb_pos.z)
                           for pb, pb_pos in truck.placed_boxes):
                        # Размещаем коробку
                        truck.place_box(box, pos)
                        truck.update_spaces(box, pos)  # Обновляем доступные пространства
                        total_weight += box.weight
                        placed = True
                        break
            if not placed:
                # Если не удалось разместить — сохраняем на вторую попытку
                unplaced_boxes.append(box)

    # Вторая попытка размещения оставшихся коробок (например, если они стали влезать в новые пространства)
    remaining_boxes = unplaced_boxes.copy()
    unplaced_boxes = []

    while remaining_boxes:
        box = remaining_boxes.pop(0)
        if total_weight + box.weight <= truck.max_weight:
            placed = False
            for i, space in enumerate(truck.spaces):
                if truck.can_place(box, space):
                    pos = Position(space.x, space.y, space.z)
                    # Проверка пересечения с другими коробками
                    if all(not (pos.x < pb_pos.x + pb.length and pos.x + box.length > pb_pos.x and
                                pos.y < pb_pos.y + pb.width and pos.y + box.width > pb_pos.y and
                                pos.z < pb_pos.z + pb.height and pos.z + box.height > pb_pos.z)
                           for pb, pb_pos in truck.placed_boxes):
                        # Защита от дубликатов: не размещаем коробку с таким же ID, если она уже стоит
                        if not any(pb.id == box.id for pb, _ in truck.placed_boxes):
                            truck.place_box(box, pos)
                            truck.update_spaces(box, pos)
                            total_weight += box.weight
                            placed = True
                            break
            if not placed:
                unplaced_boxes.append(box)

    # Подсчёт объёма загруженных коробок
    used_volume = sum(b.length * b.width * b.height for b, _ in truck.placed_boxes)
    total_volume = truck.length * truck.width * truck.height

    # Подсчёт эффективности упаковки (доля использованного объёма)
    fitness = used_volume / total_volume if total_volume > 0 else 0

    # Возвращаем эффективность упаковки и список неразмещённых коробок
    return fitness, unplaced_boxes


class ACO:
    def __init__(self, boxes: List[Box], truck: Truck, num_ants: int, iterations: int, strategy: str, alpha: float, beta: float, evaporation_rate: float):
        self.boxes = boxes
        self.truck = truck
        self.num_ants = num_ants
        self.iterations = iterations
        self.strategy = strategy
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.pheromones = [1.0] * len(boxes)
        self.best_solution = []
        self.best_fitness = 0

    def get_heuristic(self, box: Box) -> float:
        if self.strategy == "value_per_volume":
            volume = box.length * box.width * box.height
            return box.value / volume if volume > 0 else 0
        elif self.strategy == "weight":
            return box.weight
        elif self.strategy == "length":
            return box.length
        else:
            raise ValueError(f"Unknown strategy: {self.strategy}")

    def construct_solution(self) -> List[Box]:
        solution = []
        for i, box in enumerate(self.boxes):
            heuristic = self.get_heuristic(box)
            prob = (self.pheromones[i] ** self.alpha) * (heuristic ** self.beta)
            if random.random() < prob / (1 + prob):
                solution.append(box)
        return solution

    def evaluate(self, solution: List[Box]) -> float:
        fitness, unplaced = maximal_space_packing(self.truck, solution)
        if unplaced:
            return 0
        if self.strategy == "value_per_volume":
            total_value = sum(box.value for box in solution)
            return total_value
        elif self.strategy == "weight":
            total_weight = sum(box.weight for box in solution)
            return total_weight
        elif self.strategy == "length":
            total_length = sum(box.length for box in solution)
            return total_length
        else:
            raise ValueError(f"Unknown strategy: {self.strategy}")

    def update_pheromones(self, solutions: List[Tuple[List[Box], float]]):
        for i in range(len(self.pheromones)):
            self.pheromones[i] *= (1 - self.evaporation_rate)
        for solution, fitness in solutions:
            for box in solution:
                idx = self.boxes.index(box)
                self.pheromones[idx] += fitness / 100

    def run(self) -> List[Box]:
        for _ in range(self.iterations):
            solutions = []
            for _ in range(self.num_ants):
                solution = self.construct_solution()
                fitness = self.evaluate(solution)
                solutions.append((solution, fitness))
                if fitness > self.best_fitness:
                    self.best_fitness = fitness
                    self.best_solution = solution.copy()
            self.update_pheromones(solutions)
        return self.best_solution

def pack_multiple_trucks(trucks: List[Truck], boxes: List[Box], num_ants: int, iterations: int, strategy: str, alpha: float, beta: float, evaporation_rate: float) -> Tuple[List[Truck], List[Box]]:
    remaining_boxes = boxes.copy()
    used_trucks = []
    # Для каждого грузовика
    for truck in trucks:
        if not remaining_boxes:
            break
        
        # Запуск ACO с методом Maximal-Space для размещения
        aco = ACO(boxes=remaining_boxes, truck=truck, num_ants=num_ants, 
                  iterations=iterations, strategy=strategy, 
                  alpha=alpha, beta=beta, evaporation_rate=evaporation_rate)
        aco_solution = aco.run()
        # Проверка заполненности
        fitness, unplaced_boxes = maximal_space_packing(truck, aco_solution)

        placed_box_ids = {box.id for box, _ in truck.placed_boxes}
        additional_boxes = [box for box in remaining_boxes if box.id not in placed_box_ids]
        if additional_boxes:
            current_placed = truck.placed_boxes.copy()
            current_spaces = truck.spaces.copy()
            additional_fitness, additional_unplaced = maximal_space_packing(truck, additional_boxes)
            if len(truck.placed_boxes) <= len(current_placed):
                truck.placed_boxes = current_placed
                truck.spaces = current_spaces

        placed_box_ids = {box.id for box, _ in truck.placed_boxes}
        remaining_boxes = [box for box in remaining_boxes if box.id not in placed_box_ids]
        used_trucks.append(truck)

    return used_trucks, remaining_boxes

def load_boxes_from_json(file_path: str) -> List[Box]:
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        boxes = [
            Box(
                length=float(item['length']),
                width=float(item['width']),
                height=float(item['height']),
                value=float(item['value']),
                weight=float(item['weight']),
                id=int(item['id'])
            )
            for item in data
        ]
        return boxes
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return []
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in file {file_path}.")
        return []
    except KeyError as e:
        print(f"Error: Missing key {e} in JSON data.")
        return []