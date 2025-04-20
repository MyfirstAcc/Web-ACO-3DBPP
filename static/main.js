let scene, camera, renderer, controls, raycaster, mouse;
let currentTruckMesh = null;
let boxMeshes = [];
let trucksData = [];
let labelMeshes = []; // Массив для хранения меток
let tooltip = document.getElementById('tooltip');
let boxesData = [];
let trucksList = [];
let testId = -1;

function showSpinner() {
    document.getElementById('spinner').classList.remove('hidden');
}

function hideSpinner() {
    document.getElementById('spinner').classList.add('hidden');
}

function initThreeJS() {
    const container = document.getElementById('three-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd3d3d3); // Светло-серый фон
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    // Оси и сетка
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Яркий общий свет
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Яркий направленный свет
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Управление камерой
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Raycaster для наведения
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (typeof TWEEN !== 'undefined') {
        TWEEN.update(); // Обновление анимаций
    } else {
        console.warn('TWEEN.js не загрузился, анимация отключена');
    }
    controls.update();
    renderer.render(scene, camera);
}

function loadBoxes() {
    fetch('/api/boxes')
        .then(response => response.json())
        .then(boxes => {
            boxesData = boxes;
            const tbody = document.querySelector('#box-table tbody');
            tbody.innerHTML = '';
            boxes.forEach(box => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="p-2"><input type="number" value="${box.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${box.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${box.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${box.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${box.value}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="value"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${box.weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="weight"></td>
                    <td class="p-2"><button class="delete-box bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${box.id}">Удалить</button></td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Ошибка загрузки пакетов:', error));
}

function addBox() {
    const tbody = document.querySelector('#box-table tbody');
    const newId = boxesData.length > 0 ? Math.max(...boxesData.map(box => box.id)) + 1 : 1;
    const newBox = {
        id: newId,
        length: 1.0,
        width: 1.0,
        height: 1.0,
        value: 1.0,
        weight: 1.0
    };
    boxesData.push(newBox);
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-2"><input type="number" value="${newBox.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newBox.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newBox.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newBox.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newBox.value}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="value"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newBox.weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="weight"></td>
        <td class="p-2"><button class="delete-box bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${newBox.id}">Удалить</button></td>
    `;
    tbody.appendChild(row);
}

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-box')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        if (confirm('Вы уверены, что хотите удалить этот пакет?')) {
            deleteBox(id);
        }
    }
});

function deleteBox(id) {
    boxesData = boxesData.filter(box => box.id !== id);
    updateBoxTable();
}

function saveBoxes() {
    const tbody = document.querySelector('#box-table tbody');
    const rows = tbody.querySelectorAll('tr');
    const updatedBoxes = Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            id: parseInt(inputs[0].value),
            length: parseFloat(inputs[1].value),
            width: parseFloat(inputs[2].value),
            height: parseFloat(inputs[3].value),
            value: parseFloat(inputs[4].value),
            weight: parseFloat(inputs[5].value)
        };
    });

    fetch('/api/save-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBoxes)
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message || 'Пакеты успешно сохранены');
            loadBoxes(); // Перезагружаем таблицу
        })
        .catch(error => console.error('Ошибка сохранения пакетов:', error));
}

function updateBoxTable() {
    const tbody = document.querySelector('#box-table tbody');
    tbody.innerHTML = '';
    boxesData.forEach(box => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-2"><input type="number" value="${box.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
            <td class="p-2"><input type="number" step="0.1" value="${box.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
            <td class="p-2"><input type="number" step="0.1" value="${box.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
            <td class="p-2"><input type="number" step="0.1" value="${box.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
            <td class="p-2"><input type="number" step="0.1" value="${box.value}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="value"></td>
            <td class="p-2"><input type="number" step="0.1" value="${box.weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="weight"></td>
            <td class="p-2"><button class="delete-box bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${box.id}">Удалить</button></td>
        `;
        tbody.appendChild(row);
    });
}

document.addEventListener('input', (event) => {
    if (event.target.closest('#box-table')) {
        const row = event.target.closest('tr');
        const id = parseInt(row.querySelector('input[data-field="id"]').value);
        const field = event.target.getAttribute('data-field');
        const value = event.target.value;

        const box = boxesData.find(b => b.id === id);
        if (box) {
            if (field === 'id') box[field] = parseInt(value);
            else box[field] = parseFloat(value);
        }
    }
});

function loadTrucks() {
    fetch('/api/trucks')
        .then(response => response.json())
        .then(trucks => {
            trucksList = trucks;
            const tbody = document.querySelector('#truck-table tbody');
            tbody.innerHTML = '';
            trucks.forEach(truck => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="p-2"><input type="number" value="${truck.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${truck.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${truck.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
                    <td class="p-2"><input type="number" step="0.1" value="${truck.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
                    <td class="p-2"><input type="number" value="${truck.max_weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="max_weight"></td>
                     <td class="p-2"><button class="delete-truck bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${truck.id}">Удалить</button></td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Ошибка загрузки грузовиков:', error));
}

function addTruck() {
    const tbody = document.querySelector('#truck-table tbody');
    const newId = trucksList.length > 0 ? Math.max(...trucksList.map(truck => truck.id)) + 1 : 1;
    const newTruck = {
        id: newId,
        length: 10.0,
        width: 2.5,
        height: 2.5,
        max_weight: 15000
    };
    trucksList.push(newTruck);
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-2"><input type="number" value="${newTruck.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newTruck.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newTruck.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
        <td class="p-2"><input type="number" step="0.1" value="${newTruck.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
        <td class="p-2"><input type="number" value="${newTruck.max_weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="max_weight"></td>
        <td class="p-2"><button class="delete-truck bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${newTruck.id}">Удалить</button></td>
    `;
    tbody.appendChild(row);
}


function saveTrucks() {
    const tbody = document.querySelector('#truck-table tbody');
    const rows = tbody.querySelectorAll('tr');
    const updatedTrucks = Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            id: parseInt(inputs[0].value),
            length: parseFloat(inputs[1].value),
            width: parseFloat(inputs[2].value),
            height: parseFloat(inputs[3].value),
            max_weight: parseInt(inputs[4].value)
        };
    });

    fetch('/api/save-trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTrucks)
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message || 'Грузовики успешно сохранены');
            loadTrucks();
        })
        .catch(error => console.error('Ошибка сохранения грузовиков:', error));
}

function deleteTruck(id) {
    trucksList = trucksList.filter(truck => truck.id !== id);
    updateTruckTable();
}

function updateTruckTable() {
    const tbody = document.querySelector('#truck-table tbody');
    tbody.innerHTML = '';
    trucksList.forEach(truck => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-2"><input type="number" value="${truck.id}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="id"></td>
            <td class="p-2"><input type="number" step="0.1" value="${truck.length}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="length"></td>
            <td class="p-2"><input type="number" step="0.1" value="${truck.width}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="width"></td>
            <td class="p-2"><input type="number" step="0.1" value="${truck.height}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="height"></td>
            <td class="p-2"><input type="number" value="${truck.max_weight}" class="w-full p-1 border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" data-field="max_weight"></td>
            <td class="p-2"><button class="delete-truck bg-red-500 text-white p-1 rounded hover:bg-red-600" data-id="${truck.id}">Удалить</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Обработчик для редактирования полей
document.addEventListener('input', (event) => {
    if (event.target.closest('#truck-table')) {
        const row = event.target.closest('tr');
        const id = parseInt(row.querySelector('input[data-field="id"]').value);
        const field = event.target.getAttribute('data-field');
        const value = event.target.value;

        const truck = trucksList.find(t => t.id === id);
        if (truck) {
            if (field === 'id') truck[field] = parseInt(value);
            else if (field === 'max_weight') truck[field] = parseInt(value);
            else truck[field] = parseFloat(value);
        }
    }
});

// Обработчик для кнопок удаления грузовиков
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-truck')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        if (confirm('Вы уверены, что хотите удалить этот грузовик?')) {
            deleteTruck(id);
        }
    }
});

function clearScene() {
    if (currentTruckMesh) {
        scene.remove(currentTruckMesh);
        currentTruckMesh = null;
    }
    boxMeshes.forEach(mesh => scene.remove(mesh));
    boxMeshes = [];
    // Удаляем все метки
    labelMeshes.forEach(label => scene.remove(label));
    labelMeshes = [];
}

function visualizeTruck(truck) {
    clearScene();

    // Создаём каркас грузовика, дно на уровне Y=0
    const truckGeometry = new THREE.BoxGeometry(truck.length, truck.height, truck.width);
    const truckMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
    currentTruckMesh = new THREE.Mesh(truckGeometry, truckMaterial);
    currentTruckMesh.position.set(0, truck.height / 2, 0); // Дно грузовика на Y=0
    scene.add(currentTruckMesh);

    // Функция для создания текстовой метки
    function createLabel(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 138;
        canvas.height = 32;
        context.font = '20px Arial';
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = 'black';
        context.strokeRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(2, 0.5, 1); // Масштабируем метку
        return sprite;
    }

    // Добавляем метки с размерами (исправляем длину и ширину)

    const lengthLabel = createLabel(`${truck.length} м (длина)`, new THREE.Vector3(0, truck.height / 2, truck.width / 2 + 1)); // X - длина
    const widthLabel = createLabel(`${truck.width} м (ширина)`, new THREE.Vector3(truck.length / 2 + 1, truck.height / 2, 0)); // Z - ширина
    const heightLabel = createLabel(`${truck.height} м (высота)`, new THREE.Vector3(0, truck.height + 1, 0)); // Y - высота
    console.log('Truck dimensions:', truck.length, truck.width, truck.height)
    scene.add(lengthLabel);
    scene.add(widthLabel);
    scene.add(heightLabel);

    // Сохраняем метки в массив
    labelMeshes.push(lengthLabel, widthLabel, heightLabel);

    // Создаём ящики с анимацией
    boxMeshes = [];
    truck.placed_boxes.forEach((box, index) => {
        const geometry = new THREE.BoxGeometry(box.length, box.height, box.width);

        // Тонкое изменение красного цвета
        const baseColor = new THREE.Color(0xff0000); // Базовый красный
        const variation = (index % 10) * 0.05; // Небольшое изменение (0–0.45)
        const redVariation = Math.max(0, 1 - variation); // Уменьшаем красный канал
        const greenVariation = variation * 0.2; // Слегка добавляем зелёный для оттенка
        const adjustedColor = new THREE.Color().setRGB(redVariation, greenVariation, 0);

        const material = new THREE.MeshPhongMaterial({
            color: adjustedColor,
            opacity: 0.9,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Добавляем границы ящика
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        wireframe.raycast = () => { }; // Отключаем raycasting для границ
        mesh.add(wireframe);

        const finalPosition = {
            x: box.position.x + box.length / 2 - truck.length / 2, // Центрируем по X
            y: box.position.z + box.height / 2, // Пол грузовика на Y=0, учитываем только высоту ящика
            z: box.position.y + box.width / 2 - truck.width / 2 // Центрируем по Z
        };
        mesh.position.set(finalPosition.x, finalPosition.y + 5, finalPosition.z); // Начинаем выше для анимации
        mesh.userData = box; // Сохраняем данные ящика
        scene.add(mesh);
        boxMeshes.push(mesh);

        // Анимация падения, если TWEEN доступен
        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(mesh.position)
                .to({ y: finalPosition.y }, 500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .delay(index * 200)
                .start();
        } else {
            mesh.position.y = finalPosition.y; // Без анимации
        }
    });
}

async function downloadExcel(testId) {
    const response = await fetch('/api/save_excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId })
    });

    if (!response.ok) {
        alert("Ошибка при генерации Excel-файла");
        return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packing_report_${testId}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function runACO() {
    const runButton = document.getElementById('run-aco');
    runButton.disabled = true; // Отключаем кнопку
    showSpinner();
    const params = {
        num_ants: parseInt(document.getElementById('num-ants').value),
        iterations: parseInt(document.getElementById('iterations').value),
        strategy: document.getElementById('strategy').value,
        alpha: parseFloat(document.getElementById('alpha').value),
        beta: parseFloat(document.getElementById('beta').value),
        evaporation_rate: parseFloat(document.getElementById('evaporation-rate').value),
        boxes: boxesData,
        trucks: trucksList
    };

    fetch('/api/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            trucksData = data.trucks;
            const truckSelector = document.getElementById('truck-selector');
            truckSelector.innerHTML = trucksData.map(t => `<option value="${t.truck_id}">Грузовик ${t.truck_id}</option>`).join('');
            if (trucksData.length > 0) {
                visualizeTruck(trucksData[0]);
            }
            testId = data.test_id;
            console.log(testId);
            let resultText = '';
            data.trucks.forEach(truck => {
                resultText += `
                    <h3 class="text-lg font-semibold">Грузовик ${truck.truck_id}</h3>
                    <p>Заполнение объёма: ${(truck.fitness * 100).toFixed(2)}%</p>
                    <p>Общий вес: ${truck.total_weight} кг</p>
                    <p>Общая стоимость: ${truck.total_value}</p>
                    <p>Размещено пакетов: ${truck.placed_boxes.length}</p>
                `;
            });
            if (data.unplaced_boxes.length > 0) {
                resultText += `<p>Неразмещённые пакеты: ${data.unplaced_boxes.map(b => b.id).join(', ')}</p>`;
            } else {
                resultText += `<p>Все пакеты размещены!</p>`;
            }
            document.getElementById('result-text').innerHTML = resultText;

            document.getElementById('save-results').onclick = () => downloadExcel(testId);
        })
        .catch(error => {
            console.error('Ошибка выполнения ACO:', error);
            alert('Произошла ошибка при выполнении ACO');
        })
        .finally(() => {
            hideSpinner();
            runButton.disabled = false; // Включаем кнопку обратно
        });
}

function onMouseMove(event) {
    //event.preventDefault();
    const container = document.getElementById('three-canvas');
    const rect = container.getBoundingClientRect();
    const tooltip = document.getElementById('tooltip');

    // Игнорируем событие, если оно над .truck-selector
    if (event.target.closest('.truck-selector')) {
        return; // Не обрабатываем событие
    }

    let clientX, clientY;
    if (event.type === 'touchstart' || event.type === 'touchmove') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Нормализованные координаты мыши для raycaster
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boxMeshes, false);

    boxMeshes.forEach(mesh => mesh.material.emissive.set(0x000000));

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const box = mesh.userData;
        mesh.material.emissive.set(0xffff00);

        if (window.innerWidth < 768) {
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${clientX - rect.left}px`;
            tooltip.style.top = `${clientY - rect.top - 10}px`;
            tooltip.style.bottom = 'auto';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.zIndex = '1000';

            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > rect.right) {
                tooltip.style.left = `${rect.width - tooltipRect.width / 2}px`;
            }
            if (tooltipRect.left < rect.left) {
                tooltip.style.left = `${tooltipRect.width / 2}px`;
            }
            if (tooltipRect.top < rect.top) {
                tooltip.style.top = `${10}px`;
            }
        } else {
            tooltip.style.position = 'fixed';
            tooltip.style.left = `${clientX + 10}px`;
            tooltip.style.top = `${clientY + 10}px`;
            tooltip.style.bottom = 'auto';
            tooltip.style.transform = 'none';
        }

        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            ID: ${box.id}<br>
            Длина: ${box.length}<br>
            Ширина: ${box.width}<br>
            Высота: ${box.height}<br>
            Вес: ${box.weight} кг<br>
            Стоимость: ${box.value}
        `;
    } else {
        tooltip.style.display = 'none';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    loadBoxes();
    loadTrucks();
    document.getElementById('run-aco').addEventListener('click', runACO);
    document.getElementById('add-box').addEventListener('click', addBox);
    document.getElementById('add-truck').addEventListener('click', addTruck);

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        // Сохраняем выбор пользователя
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });

    // Загружаем сохранённую тему или системную
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Выбор грузовика
    document.getElementById('truck-selector').addEventListener('change', (e) => {
        const truckId = parseInt(e.target.value);
        const truck = trucksData.find(t => t.truck_id === truckId);
        if (truck) visualizeTruck(truck);
    });

    // Обработка наведения (мышь и сенсорные события)
    const canvas = document.getElementById('three-canvas');
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchstart', onMouseMove);
    canvas.addEventListener('touchmove', onMouseMove);

    // Скрываем tooltip при уходе с ящика или завершении касания
    canvas.addEventListener('touchend', () => {
        boxMeshes.forEach(mesh => mesh.material.emissive.set(0x000000));
        tooltip.style.display = 'none';
    });

    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        const container = document.getElementById('three-canvas');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});