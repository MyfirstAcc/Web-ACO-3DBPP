from flask import Flask, request, jsonify, send_from_directory
from bpp_aco_ms import load_boxes_from_json, Truck, pack_multiple_trucks
import os
import json

app = Flask(__name__)

# Serve static files (HTML, JS)
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

# Endpoint to get boxes from JSON
@app.route('/api/boxes', methods=['GET'])
def get_boxes():
    boxes = load_boxes_from_json('boxes.json')
    boxes_data = [
        {
            'id': box.id,
            'length': box.length,
            'width': box.width,
            'height': box.height,
            'value': box.value,
            'weight': box.weight
        } for box in boxes
    ]
    return jsonify(boxes_data)

# Endpoint to save edited boxes
@app.route('/api/save-boxes', methods=['POST'])
def save_boxes():
    data = request.get_json()
    try:
        with open('boxes.json', 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({'message': 'Ящики успешно сохранены'})
    except Exception as e:
        return jsonify({'error': f'Ошибка сохранения ящиков: {str(e)}'}), 500

# Endpoint to get trucks from JSON
@app.route('/api/trucks', methods=['GET'])
def get_trucks():
    try:
        with open('trucks.json', 'r') as f:
            trucks_data = json.load(f)
        return jsonify(trucks_data)
    except Exception as e:
        return jsonify({'error': f'Ошибка загрузки грузовиков: {str(e)}'}), 500

# Endpoint to save edited trucks
@app.route('/api/save-trucks', methods=['POST'])
def save_trucks():
    data = request.get_json()
    try:
        with open('trucks.json', 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({'message': 'Грузовики успешно сохранены'})
    except Exception as e:
        return jsonify({'error': f'Ошибка сохранения грузовиков: {str(e)}'}), 500

# Endpoint to run ACO packing
@app.route('/api/pack', methods=['POST'])
def pack_trucks():
    data = request.get_json()
    num_ants = int(data.get('num_ants', 50))
    iterations = int(data.get('iterations', 100))
    strategy = data.get('strategy', 'value_per_volume')
    alpha = float(data.get('alpha', 3.0))
    beta = float(data.get('beta', 2.0))
    evaporation_rate = float(data.get('evaporation_rate', 0.5))

    # Load boxes
    boxes = load_boxes_from_json('boxes.json')
    if not boxes:
        return jsonify({'error': 'Failed to load boxes'}), 400

    # Load trucks from JSON
    try:
        with open('trucks.json', 'r') as f:
            trucks_data = json.load(f)
        trucks = [
            Truck(length=truck['length'], width=truck['width'], height=truck['height'], 
                  max_weight=truck['max_weight'], id=truck['id'])
            for truck in trucks_data
        ]
    except Exception as e:
        return jsonify({'error': f'Ошибка загрузки грузовиков: {str(e)}'}), 500

    # Run ACO packing
    used_trucks, unplaced_boxes = pack_multiple_trucks(
        trucks, boxes, num_ants, iterations, strategy, alpha, beta, evaporation_rate
    )

    # Prepare response
    result = []
    for truck in used_trucks:
        placed_boxes = [
            {
                'id': box.id,
                'length': box.length,
                'width': box.width,
                'height': box.height,
                'value': box.value,
                'weight': box.weight,
                'position': {'x': pos.x, 'y': pos.y, 'z': pos.z}
            } for box, pos in truck.placed_boxes
        ]
        weight = sum(box.weight for box, _ in truck.placed_boxes)
        value = sum(box.value for box, _ in truck.placed_boxes)
        used_volume = sum(b.length * b.width * b.height for b, _ in truck.placed_boxes)
        total_volume = truck.length * truck.width * truck.height
        fitness = used_volume / total_volume if total_volume > 0 else 0

        result.append({
            'truck_id': truck.id,
            'length': truck.length,
            'width': truck.width,
            'height': truck.height,
            'max_weight': truck.max_weight,
            'placed_boxes': placed_boxes,
            'fitness': fitness,
            'total_weight': weight,
            'total_value': value
        })

    unplaced = [{'id': box.id, 'length': box.length, 'width': box.width, 'height': box.height,
                 'value': box.value, 'weight': box.weight} for box in unplaced_boxes]

    return jsonify({'trucks': result, 'unplaced_boxes': unplaced})

if __name__ == '__main__':
    app.run(debug=True)