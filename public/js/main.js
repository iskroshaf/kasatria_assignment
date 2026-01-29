// const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = '';

let CLIENT_ID = '';
let SPREADSHEET_ID = '';
let SCOPES = '';

let tokenClient;
let gisInited = false;
let tableData = [];
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
let currentAccessToken = null;

async function loadConfig() {
    try {
        console.log(`Loading config from ${API_BASE_URL}/api/config...`);
        const response = await fetch(`${API_BASE_URL}/api/config`);
        const config = await response.json();
        CLIENT_ID = config.clientId;
        SPREADSHEET_ID = config.spreadsheetId;
        SCOPES = config.scopes;
        console.log('✅ Configuration loaded successfully');
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Failed to connect to API server. Make sure the server is running at ' + API_BASE_URL);
    }
}

async function gisLoaded() {
    await loadConfig();

    if (!CLIENT_ID) {
        console.error('Client ID not loaded. Cannot initialize Google Sign-In.');
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp) => {
            if (resp.error !== undefined) {
                console.error('Auth error:', resp);
                throw (resp);
            }
            currentAccessToken = resp.access_token;
            document.getElementById('login-overlay').style.display = 'none';
            await fetchData();
            initVisualization();
            animate();
        },
    });
    gisInited = true;
    console.log('✅ Google Identity Services loaded');
}

function handleAuthClick() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        console.error('Token client not initialized');
    }
}

async function fetchData() {
    try {
        console.log('📡 Fetching spreadsheet data...');
        const response = await fetch(`${API_BASE_URL}/api/sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accessToken: currentAccessToken,
                spreadsheetId: SPREADSHEET_ID,
                range: "'Data Template'!A2:F"
            })
        });

        const data = await response.json();
        console.log('Received data:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        const values = data.values;

        if (values && values.length > 0) {
            tableData = values.map((row, index) => ({
                id: index + 1,
                name: row[0] || 'Unknown',
                photo: row[1] || 'https://via.placeholder.com/80',
                age: row[2] || 'N/A',
                country: row[3] || 'N/A',
                interest: row[4] || 'N/A',
                netWorthStr: row[5] || '$0',
                netWorthVal: parseFloat((row[5] || '0').replace(/[$,]/g, ''))
            }));
            console.log(`Processed ${tableData.length} records`);
        } else {
            console.warn('⚠️ No data found in spreadsheet, using fallback data');
            useFallbackData();
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        useFallbackData();
    }
}

function useFallbackData() {
    tableData = [
        {
            id: 1,
            name: "Lee Siew Suan",
            photo: "https://via.placeholder.com/80",
            netWorthVal: 251260,
            age: "25",
            country: "MY",
            interest: "Technology",
            netWorthStr: "$251,260"
        },
        {
            id: 2,
            name: "New Yee Chian",
            photo: "https://via.placeholder.com/80",
            netWorthVal: 60393,
            age: "30",
            country: "SG",
            interest: "Finance",
            netWorthStr: "$60,393"
        },
    ];
    console.log('ℹ️ Using fallback data with', tableData.length, 'records');
}

function initVisualization() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 4000;
    scene = new THREE.Scene();

    for (let i = 0; i < tableData.length; i++) {
        const item = tableData[i];
        const element = document.createElement('div');

        element.className = 'element';

        if (item.netWorthVal > 200000) {
            element.classList.add('green');
        } else if (item.netWorthVal > 100000) {
            element.classList.add('yellow');
        } else {
            element.classList.add('red');
        }

        element.innerHTML = `
                    <div class="card-header">
                        <span>${item.country}</span>
                        <span>${item.age}</span>
                    </div>
                    
                    <div class="card-body">
                         <img class="card-img" src="${item.photo}" onerror="this.src='https://via.placeholder.com/80'">
                    </div>

                    <div class="card-footer">
                        <div class="card-name">${item.name}</div>
                        <div class="card-sub">${item.interest}</div>
                    </div>
                `;

        const object = new THREE.CSS3DObject(element);
        object.position.x = Math.random() * 4000 - 2000;
        object.position.y = Math.random() * 4000 - 2000;
        object.position.z = Math.random() * 4000 - 2000;
        scene.add(object);
        objects.push(object);
    }

    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        const col = i % 20;
        const row = Math.floor(i / 20);
        object.position.x = (col * 160) - (20 * 160 / 2);
        object.position.y = -(row * 220) + (10 * 220 / 2);
        targets.table.push(object);
    }

    const vector = new THREE.Vector3();
    for (let i = 0; i < objects.length; i++) {
        const phi = Math.acos(-1 + (2 * i) / objects.length);
        const theta = Math.sqrt(objects.length * Math.PI) * phi;
        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);
        targets.sphere.push(object);
    }

    for (let i = 0; i < objects.length; i++) {
        const theta = i * 0.175 + Math.PI;
        const y = -(i * 8) + 450;
        const object = new THREE.Object3D();
        const offset = (i % 2 === 0) ? 0 : Math.PI;
        const radius = 900;
        object.position.setFromCylindricalCoords(radius, theta + offset, y);
        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);
        targets.helix.push(object);
    }

    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        const x = (i % 5) * 400 - 800;
        const y = (-Math.floor((i / 5) % 4) * 400) + 800;
        const z = (Math.floor(i / 20)) * 1000 - 2000;
        object.position.set(x, y, z);
        targets.grid.push(object);
    }

    renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    document.getElementById('table').addEventListener('click', function () { transform(targets.table, 2000); });
    document.getElementById('sphere').addEventListener('click', function () { transform(targets.sphere, 2000); });
    document.getElementById('helix').addEventListener('click', function () { transform(targets.helix, 2000); });
    document.getElementById('grid').addEventListener('click', function () { transform(targets.grid, 2000); });

    transform(targets.table, 2000);
    window.addEventListener('resize', onWindowResize);
}

function transform(targets, duration) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targets[i];
        if (!target) continue;
        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }
    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}