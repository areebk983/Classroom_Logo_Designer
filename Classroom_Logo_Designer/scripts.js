/**
 * Pro Classroom Logo Designer v2.0
 * Developed by: Muhammad Areeb (https://github.com/muhammad-areeb-1)
 * 
 * Fixed and enhanced version with working rotation and resizing
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- STATE MANAGEMENT ---
    const state = {
        canvas: null, ctx: null,
        objects: [], history: [], historyIndex: -1,
        selectedObjectId: null,
        activeTool: 'select',
        isDragging: false, isResizing: false, isRotating: false,
        dragStart: { x: 0, y: 0 },
        resizeHandle: null,
        canvasScale: 1.0,
    };

    // --- UI ELEMENTS ---
    const ui = {
        canvas: document.getElementById('logo-canvas'),
        layersPanel: document.getElementById('layers-panel'),
        toolBtns: document.querySelectorAll('.tool-btn'),
        // Appearance Panel
        appearancePanel: document.getElementById('appearance-panel'),
        textProps: document.getElementById('text-props'),
        shapeProps: document.getElementById('shape-props'),
        commonProps: document.getElementById('common-props'),
        fillTypeSelect: document.getElementById('fill-type-select'),
        solidFillProps: document.getElementById('solid-fill-props'),
        gradientFillProps: document.getElementById('gradient-fill-props'),
        // Inputs
        textInput: document.getElementById('text-input'),
        fontSelect: document.getElementById('font-select'),
        fontSize: document.getElementById('font-size'),
        textColor: document.getElementById('text-color'),
        fillColor: document.getElementById('fill-color'),
        strokeColor: document.getElementById('stroke-color'),
        strokeWidth: document.getElementById('stroke-width'),
        gradientColor1: document.getElementById('gradient-color-1'),
        gradientColor2: document.getElementById('gradient-color-2'),
        opacitySlider: document.getElementById('opacity-slider'),
        opacityValue: document.getElementById('opacity-value'),
        zoomLevel: document.getElementById('zoom-level'),
    };
    
    // --- CONSTANTS ---
    const HANDLE_SIZE = 8;
    const ROTATION_HANDLE_OFFSET = 25;

    // --- INITIALIZATION ---
    function init() {
        state.canvas = ui.canvas;
        state.ctx = ui.canvas.getContext('2d');
        setupEventListeners();
        saveState();
        render();
        console.log("Logo Designer Initialized.");
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        window.addEventListener('resize', render);
        document.addEventListener('keydown', handleKeyDown);

        state.canvas.addEventListener('mousedown', handleMouseDown);
        state.canvas.addEventListener('mousemove', handleMouseMove);
        state.canvas.addEventListener('mouseup', handleMouseUp);
        state.canvas.addEventListener('mouseout', handleMouseUp);

        ui.toolBtns.forEach(btn => btn.addEventListener('click', () => setActiveTool(btn.dataset.tool)));
        document.getElementById('add-text-btn').addEventListener('click', addText);
        document.querySelectorAll('.icon-btn').forEach(btn => btn.addEventListener('click', () => addIcon(btn.dataset.icon)));
        
        // Property listeners
        const propInputs = [
            ui.textColor, ui.fillColor, ui.strokeColor, ui.strokeWidth, ui.fillTypeSelect,
            ui.gradientColor1, ui.gradientColor2, ui.opacitySlider
        ];
        propInputs.forEach(el => el.addEventListener('input', updateSelectedObjectProperties));

        // Actions
        const actions = {
            'undo-btn': undo, 'redo-btn': redo, 'clear-btn': clearCanvas,
            'delete-btn': deleteSelectedObject, 'bring-forward-btn': bringForward,
            'send-backward-btn': sendBackward, 'zoom-in-btn': zoomIn, 'zoom-out-btn': zoomOut,
            'save-png-btn': saveAsPNG, 'save-svg-btn': saveAsSVG,
            'save-json-btn': saveProject, 'load-json-btn': loadProject,
        };
        for (const id in actions) {
            document.getElementById(id).addEventListener('click', actions[id]);
        }
        
        document.querySelectorAll('.align-tools button').forEach(btn => 
            btn.addEventListener('click', () => alignSelectedObject(btn.dataset.align))
        );
    }

    // --- CORE RENDER FUNCTION ---
    function render() {
        const { ctx, canvas } = state;
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCheckerboard();
        state.objects.forEach(obj => drawObject(ctx, obj));
        const selectedObject = getSelectedObject();
        if (selectedObject) {
            drawSelectionHandles(ctx, selectedObject);
        }
        ctx.restore();
        updateLayersPanel();
    }

    function drawCheckerboard() {
        const size = 20;
        for (let x = 0; x < state.canvas.width; x += size) {
            for (let y = 0; y < state.canvas.height; y += size) {
                state.ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#f9f9f9' : '#ffffff';
                state.ctx.fillRect(x, y, size, size);
            }
        }
    }

    // --- DRAWING & OBJECTS ---
    function drawObject(ctx, obj) {
        ctx.save();
        ctx.globalAlpha = obj.opacity;
        
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        ctx.rotate(obj.rotation);
        
        ctx.fillStyle = getFillStyle(ctx, obj);
        ctx.strokeStyle = obj.strokeColor;
        ctx.lineWidth = obj.strokeWidth;
        
        ctx.translate(-(obj.width / 2), -(obj.height / 2));

        switch (obj.type) {
            case 'rectangle':
                ctx.fillRect(0, 0, obj.width, obj.height);
                if (ctx.lineWidth > 0) ctx.strokeRect(0, 0, obj.width, obj.height);
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(obj.width / 2, obj.height / 2, obj.width / 2, 0, Math.PI * 2);
                ctx.fill();
                if (ctx.lineWidth > 0) ctx.stroke();
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(obj.width / 2, 0); 
                ctx.lineTo(obj.width, obj.height); 
                ctx.lineTo(0, obj.height);
                ctx.closePath();
                ctx.fill();
                if (ctx.lineWidth > 0) ctx.stroke();
                break;
            case 'text':
                ctx.fillStyle = obj.color;
                ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
                ctx.textBaseline = 'top';
                ctx.fillText(obj.text, 0, 0);
                break;
            case 'icon':
                ctx.fillStyle = obj.color;
                ctx.font = `${obj.width * 0.9}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(obj.icon, obj.width/2, obj.height/2);
                break;
        }
        ctx.restore();
    }
    
    function getFillStyle(ctx, obj) {
        if(obj.fillType === 'linear') {
            const gradient = ctx.createLinearGradient(0, 0, obj.width, obj.height);
            gradient.addColorStop(0, obj.gradient.color1);
            gradient.addColorStop(1, obj.gradient.color2);
            return gradient;
        }
        if(obj.fillType === 'radial') {
            const gradient = ctx.createRadialGradient(
                obj.width/2, obj.height/2, 0, 
                obj.width/2, obj.height/2, obj.width/2
            );
            gradient.addColorStop(0, obj.gradient.color1);
            gradient.addColorStop(1, obj.gradient.color2);
            return gradient;
        }
        return obj.fillColor;
    }

    function drawSelectionHandles(ctx, obj) {
        const handles = getHandles(obj);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 1;
        
        ctx.save();
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        ctx.rotate(obj.rotation);
        ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        Object.values(handles).forEach(handle => {
            ctx.beginPath();
            if (handle.type === 'rotation') {
                ctx.moveTo(obj.x + obj.width / 2, obj.y + obj.height / 2);
                ctx.lineTo(handle.x, handle.y);
                ctx.stroke();
                ctx.arc(handle.x, handle.y, HANDLE_SIZE / 1.5, 0, Math.PI * 2);
            } else {
                ctx.rect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
            }
            ctx.fill();
            ctx.stroke();
        });
    }

    // --- MOUSE & KEYBOARD INTERACTIONS ---
    function handleKeyDown(e) {
        const selectedObject = getSelectedObject();
        
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            if(selectedObject) duplicateSelectedObject();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }

        if (!selectedObject) return;
        
        let handled = true;
        switch (e.key) {
            case 'Delete': case 'Backspace': deleteSelectedObject(); break;
            case 'ArrowUp': selectedObject.y -= e.shiftKey ? 10 : 1; break;
            case 'ArrowDown': selectedObject.y += e.shiftKey ? 10 : 1; break;
            case 'ArrowLeft': selectedObject.x -= e.shiftKey ? 10 : 1; break;
            case 'ArrowRight': selectedObject.x += e.shiftKey ? 10 : 1; break;
            default: handled = false;
        }
        
        if (handled) {
            e.preventDefault();
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                clearTimeout(state.nudgeTimeout);
                state.nudgeTimeout = setTimeout(saveState, 300);
            }
            render();
        }
    }
    
    // --- OBJECT CREATION & MODIFICATION ---
    function createObject(type, options = {}) {
        const defaultProps = {
            id: Date.now(),
            x: state.canvas.width / 2 - 50, y: state.canvas.height / 2 - 50,
            width: 100, height: 100,
            rotation: 0, opacity: 1,
            strokeWidth: 2, strokeColor: '#182848',
            fillType: 'solid', fillColor: '#4b6cb7',
            gradient: { color1: '#4b6cb7', color2: '#182848' },
        };
        return { ...defaultProps, type, ...options };
    }

    function addText() {
        const text = ui.textInput.value.trim();
        if (!text) return;
        const fontSize = parseInt(ui.fontSize.value);
        state.ctx.font = `${fontSize}px ${ui.fontSelect.value}`;
        const metrics = state.ctx.measureText(text);
        
        const newObj = createObject('text', {
            text, fontSize,
            fontFamily: ui.fontSelect.value,
            color: '#333333',
            width: metrics.width,
            height: fontSize,
            x: state.canvas.width / 2 - metrics.width / 2,
            y: state.canvas.height / 2 - fontSize / 2,
        });
        state.objects.push(newObj);
        selectObject(newObj.id);
        saveState();
        ui.textInput.value = '';
    }

    function addIcon(icon) {
        const newObj = createObject('icon', {
            icon, color: '#333333', width: 60, height: 60,
            x: state.canvas.width / 2 - 30, y: state.canvas.height / 2 - 30,
        });
        state.objects.push(newObj);
        selectObject(newObj.id);
        saveState();
    }
    
    function createShapeAt(pos) {
        const type = state.activeTool;
        const newObj = createObject(type, { x: pos.x - 50, y: pos.y - 50 });
        state.objects.push(newObj);
        selectObject(newObj.id);
        setActiveTool('select');
        saveState();
    }
    
    function resizeObject(obj, dx, dy, maintainAspect) {
        const angle = obj.rotation;
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        // Rotate mouse delta into object's local space
        const localDx = dx * c + dy * s;
        const localDy = -dx * s + dy * c;

        let { x, y, width, height } = obj;
        const aspect = obj.width / obj.height;

        // Apply changes based on handle
        switch (state.resizeHandle) {
            case 'br': width += localDx; height += localDy; break;
            case 'bl': width -= localDx; height += localDy; x += localDx; break;
            case 'tr': width += localDx; height -= localDy; y += localDy; break;
            case 'tl': width -= localDx; height -= localDy; x += localDx; y += localDy; break;
            case 'tm': height -= localDy; y += localDy; break;
            case 'bm': height += localDy; break;
            case 'ml': width -= localDx; x += localDx; break;
            case 'mr': width += localDx; break;
        }

        // Maintain aspect ratio if shift is held
        if (maintainAspect && ['tl', 'tr', 'bl', 'br'].includes(state.resizeHandle)) {
            if (Math.abs(localDx) > Math.abs(localDy)) {
                height = width / aspect;
                if (state.resizeHandle.includes('t')) y = obj.y + obj.height - height;
                if (state.resizeHandle.includes('l')) x = obj.x + obj.width - width;
            } else {
                width = height * aspect;
                if (state.resizeHandle.includes('t')) y = obj.y + obj.height - height;
                if (state.resizeHandle.includes('l')) x = obj.x + obj.width - width;
            }
        }
        
        // Update object, ensuring minimum size
        obj.width = Math.max(10, width);
        obj.height = Math.max(10, height);
        obj.x = x;
        obj.y = y;
    }
    
    function duplicateSelectedObject() {
        const original = getSelectedObject();
        if (!original) return;
        
        const clone = JSON.parse(JSON.stringify(original));
        clone.id = Date.now();
        clone.x += 10;
        clone.y += 10;
        
        state.objects.push(clone);
        selectObject(clone.id);
        saveState();
    }
    
    // --- UI & STATE UPDATES ---
    function selectObject(id) {
        state.selectedObjectId = id;
        updatePropertyPanels();
        render();
    }

    function updatePropertyPanels() {
        const obj = getSelectedObject();
        if (!obj) {
            ui.appearancePanel.classList.add('disabled-panel');
            ui.textProps.classList.add('hidden');
            ui.shapeProps.classList.add('hidden');
            ui.commonProps.classList.add('hidden');
            return;
        }

        ui.appearancePanel.classList.remove('disabled-panel');
        ui.commonProps.classList.remove('hidden');

        if (obj.type === 'text') {
            ui.textProps.classList.remove('hidden');
            ui.shapeProps.classList.add('hidden');
            ui.textColor.value = obj.color;
        } else {
            ui.textProps.classList.add('hidden');
            ui.shapeProps.classList.remove('hidden');

            ui.fillTypeSelect.value = obj.fillType;
            ui.fillColor.value = obj.fillColor;
            ui.gradientColor1.value = obj.gradient.color1;
            ui.gradientColor2.value = obj.gradient.color2;
            ui.strokeColor.value = obj.strokeColor;
            ui.strokeWidth.value = obj.strokeWidth;
            
            ui.solidFillProps.classList.toggle('hidden', obj.fillType !== 'solid');
            ui.gradientFillProps.classList.toggle('hidden', obj.fillType === 'solid');
        }
        
        ui.opacitySlider.value = obj.opacity;
        ui.opacityValue.textContent = `${Math.round(obj.opacity * 100)}%`;
    }
    
    function updateSelectedObjectProperties() {
        const obj = getSelectedObject();
        if (!obj) return;

        obj.opacity = parseFloat(ui.opacitySlider.value);
        if (obj.type === 'text') {
            obj.color = ui.textColor.value;
        } else {
            obj.fillType = ui.fillTypeSelect.value;
            obj.fillColor = ui.fillColor.value;
            obj.gradient.color1 = ui.gradientColor1.value;
            obj.gradient.color2 = ui.gradientColor2.value;
            obj.strokeColor = ui.strokeColor.value;
            obj.strokeWidth = parseInt(ui.strokeWidth.value, 10);
        }
        
        updatePropertyPanels();
        saveState();
        render();
    }

    function getHandles(obj) {
        const { x, y, width, height, rotation } = obj;
        const cx = x + width / 2, cy = y + height / 2;
        const points = {
            tl: { x, y }, 
            tr: { x: x + width, y }, 
            bl: { x, y: y + height }, 
            br: { x: x + width, y: y + height },
            tm: { x: x + width / 2, y }, 
            bm: { x: x + width / 2, y: y + height },
            ml: { x, y: y + height / 2 }, 
            mr: { x: x + width, y: y + height / 2 },
            rot: { x: x + width / 2, y: y - ROTATION_HANDLE_OFFSET }
        };
        
        const rotatedHandles = {};
        for (const key in points) {
            const rotated = rotatePoint(points[key].x, points[key].y, cx, cy, rotation);
            rotatedHandles[key] = { 
                x: rotated.x, 
                y: rotated.y, 
                type: key === 'rot' ? 'rotation' : 'resize' 
            };
        }
        return rotatedHandles;
    }
    
    function handleMouseDown(e) {
        const pos = getMousePos(e);
        state.dragStart = pos;
        const selectedObject = getSelectedObject();

        if (selectedObject) {
            const handles = getHandles(selectedObject);
            for (const key in handles) {
                const handle = handles[key];
                if (isPointInHandle(pos, handle)) {
                    if (handle.type === 'rotation') {
                        state.isRotating = true;
                    } else { 
                        state.isResizing = true; 
                        state.resizeHandle = key; 
                    }
                    state.canvas.style.cursor = getCursorForHandle(key);
                    return;
                }
            }
        }
        
        const clickedObject = getObjectAtPosition(pos);
        if (clickedObject) {
            selectObject(clickedObject.id);
            state.isDragging = true;
            state.canvas.style.cursor = 'move';
        } else {
            if (state.activeTool !== 'select') createShapeAt(pos);
            else selectObject(null);
        }
        render();
    }

    function handleMouseMove(e) {
        const pos = getMousePos(e);
        if (!state.isDragging && !state.isResizing && !state.isRotating) {
            updateCursor(pos);
            return;
        }

        const dx = pos.x - state.dragStart.x;
        const dy = pos.y - state.dragStart.y;
        const selectedObject = getSelectedObject();
        if (!selectedObject) return;

        if (state.isDragging) {
            selectedObject.x += dx;
            selectedObject.y += dy;
        } else if (state.isRotating) {
            const center = {
                x: selectedObject.x + selectedObject.width / 2,
                y: selectedObject.y + selectedObject.height / 2
            };
            selectedObject.rotation = Math.atan2(pos.y - center.y, pos.x - center.x) - Math.PI / 2;
        } else if (state.isResizing) {
            resizeObject(selectedObject, dx, dy, e.shiftKey);
        }

        state.dragStart = pos;
        render();
    }

    function handleMouseUp() {
        if (state.isDragging || state.isResizing || state.isRotating) saveState();
        state.isDragging = false;
        state.isResizing = false;
        state.isRotating = false;
        state.resizeHandle = null;
        updateCursor(state.dragStart);
    }
    
    function getMousePos(e) {
        const rect = state.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / (rect.width / state.canvas.width),
            y: (e.clientY - rect.top) / (rect.height / state.canvas.height)
        };
    }

    function getObjectAtPosition(pos) {
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            const { x, y, width, height, rotation } = obj;
            const center = { x: x + width / 2, y: y + height / 2 };
            const rotatedPos = rotatePoint(pos.x, pos.y, center.x, center.y, -rotation);
            if (rotatedPos.x >= x && rotatedPos.x <= x + width && rotatedPos.y >= y && rotatedPos.y <= y + height) {
                return obj;
            }
        }
        return null;
    }
    
    function isPointInHandle(point, handle) {
        return Math.hypot(point.x - handle.x, point.y - handle.y) < HANDLE_SIZE;
    }

    function rotatePoint(x, y, cx, cy, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
        const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
        return { x: nx, y: ny };
    }
    
    function getSelectedObject() { 
        return state.objects.find(obj => obj.id === state.selectedObjectId); 
    }
    
    function setActiveTool(tool) {
        state.activeTool = tool;
        if (tool !== 'select') selectObject(null);
        ui.toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === state.activeTool));
        updateCursor(state.dragStart);
    }
    
    function updateCursor(pos) {
        const obj = getSelectedObject();
        if (obj) {
            const handles = getHandles(obj);
            for (const key in handles) {
                if (isPointInHandle(pos, handles[key])) {
                    state.canvas.style.cursor = getCursorForHandle(key);
                    return;
                }
            }
        }
        if (getObjectAtPosition(pos)) state.canvas.style.cursor = 'move';
        else if (state.activeTool !== 'select') state.canvas.style.cursor = 'crosshair';
        else state.canvas.style.cursor = 'default';
    }
    
    function getCursorForHandle(handleKey) {
        const cursors = {
            tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize',
            tm: 'ns-resize', bm: 'ns-resize', ml: 'ew-resize', mr: 'ew-resize',
            rot: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"32\\" height=\\"32\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\"><path d=\\"M23 4v6h-6\\"/><path d=\\"M1 20v-6h6\\"/><path d=\\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10\\"/><path d=\\"M20.49 15a9 9 0 0 1-14.85 3.36L1 14\\"/></svg>") 16 16, auto'
        };
        return cursors[handleKey] || 'default';
    }

    function deleteSelectedObject() {
        if (!state.selectedObjectId) return;
        state.objects = state.objects.filter(obj => obj.id !== state.selectedObjectId);
        selectObject(null);
        saveState();
    }
    
    function bringForward() {
        if (!state.selectedObjectId) return;
        const index = state.objects.findIndex(obj => obj.id === state.selectedObjectId);
        if (index < state.objects.length - 1) {
            const item = state.objects.splice(index, 1)[0];
            state.objects.splice(index + 1, 0, item);
            saveState();
            render();
        }
    }

    function sendBackward() {
        if (!state.selectedObjectId) return;
        const index = state.objects.findIndex(obj => obj.id === state.selectedObjectId);
        if (index > 0) {
            const item = state.objects.splice(index, 1)[0];
            state.objects.splice(index - 1, 0, item);
            saveState();
            render();
        }
    }
    
    function updateLayersPanel() {
        ui.layersPanel.innerHTML = '';
        if (state.objects.length === 0) {
            ui.layersPanel.innerHTML = '<p class="empty-layer-text" style="text-align:center;color:#999;padding:10px;">No layers</p>';
            return;
        }

        [...state.objects].reverse().forEach(obj => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.classList.toggle('selected', obj.id === state.selectedObjectId);
            item.dataset.id = obj.id;
            
            const icons = { 
                rectangle: 'fa-square', 
                circle: 'fa-circle', 
                triangle: 'fa-play fa-rotate-270', 
                text: 'fa-font', 
                icon: 'fa-icons' 
            };
            const iconClass = `fa-solid ${icons[obj.type] || 'fa-question'}`;
            
            let name = obj.type;
            if (obj.type === 'text') name = obj.text.substring(0, 15) + (obj.text.length > 15 ? '…' : '');
            if (obj.type === 'icon') name = obj.icon;

            item.innerHTML = `<i class="${iconClass}"></i><span>${name}</span>`;
            item.addEventListener('click', () => selectObject(obj.id));
            ui.layersPanel.appendChild(item);
        });
    }

    function alignSelectedObject(alignment) {
        const obj = getSelectedObject();
        if (!obj) return;
        const { width, height } = state.canvas;
        const objWidth = obj.width, objHeight = obj.height;
        switch (alignment) {
            case 'left': obj.x = 0; break;
            case 'center': obj.x = width / 2 - objWidth / 2; break;
            case 'right': obj.x = width - objWidth; break;
            case 'top': obj.y = 0; break;
            case 'middle': obj.y = height / 2 - objHeight / 2; break;
            case 'bottom': obj.y = height - objHeight; break;
        }
        saveState();
        render();
    }
    
    function saveState() {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(JSON.stringify(state.objects));
        state.historyIndex++;
        if (state.history.length > 50) {
            state.history.shift();
            state.historyIndex--;
        }
    }

    function undo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            state.objects = JSON.parse(state.history[state.historyIndex]);
            selectObject(null);
        }
    }

    function redo() {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            state.objects = JSON.parse(state.history[state.historyIndex]);
            selectObject(null);
        }
    }

    function clearCanvas() {
        if (confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
            state.objects = [];
            selectObject(null);
            saveState();
        }
    }
    
    function zoomIn() { 
        state.canvasScale = Math.min(3, state.canvasScale + 0.1); 
        updateZoom(); 
    }
    
    function zoomOut() { 
        state.canvasScale = Math.max(0.2, state.canvasScale - 0.1); 
        updateZoom(); 
    }
    
    function updateZoom() {
        state.canvas.style.transform = `scale(${state.canvasScale})`;
        ui.zoomLevel.textContent = `${Math.round(state.canvasScale * 100)}%`;
    }

    function saveAsPNG() {
        const currentId = state.selectedObjectId;
        selectObject(null);
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = 'classroom-logo.png';
            link.href = state.canvas.toDataURL('image/png');
            link.click();
            selectObject(currentId);
        }, 100);
    }
    
    function saveAsSVG() {
        alert("SVG Export is ready to be implemented!");
    }
    
    function saveProject() {
        const blob = new Blob([JSON.stringify({ objects: state.objects }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'logo-project.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }
    
    function loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    state.objects = data.objects || [];
                    // Add default properties to loaded objects if missing
                    state.objects.forEach(obj => {
                        if (obj.opacity === undefined) obj.opacity = 1;
                        if (obj.fillType === undefined) obj.fillType = 'solid';
                        if (obj.gradient === undefined) obj.gradient = { color1: '#4b6cb7', color2: '#182848' };
                    });
                    selectObject(null);
                    saveState();
                } catch (error) {
                    alert('Error: Could not load or parse the project file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // --- START THE APP ---
    init();
});