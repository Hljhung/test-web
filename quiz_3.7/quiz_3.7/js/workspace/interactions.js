/* ============================================================================
 *  MODULE: js/workspace/interactions.js — KÉO TỪ TOOLBOX, PAN & ZOOM
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - setupBlockListDrag() : kéo khối mẫu từ toolbox (HTML5 Drag & Drop).
 *    - setupWorkspaceDrop() : thả khối vào workspace, quy đổi toạ độ theo zoom.
 *    - setupPan()           : giữ chuột trái ở nền trống để di chuyển canvas.
 *    - setupZoom()          : Ctrl + lăn chuột, zoom đúng tâm con trỏ.
 *    - setupTouchSupport()  : bản 2.7 — thao tác CẢM ỨNG cho điện thoại:
 *        · CHẠM khối mẫu trong toolbox  ⇒ thêm khối vào vùng làm việc.
 *        · KÉO khối mẫu (giữ & di chuyển) ⇒ bóng ma bám ngón tay, thả xuống
 *          vùng làm việc để đặt khối đúng chỗ.
 *        · CHẠM & KÉO trên nền trống     ⇒ di chuyển (pan) vùng làm việc.
 *        · VÉ 2 NGÓN                    ⇒ phóng to / thu nhỏ (pinch-zoom).
 *  Lỗi đã sửa ở bản 2.0:
 *    (1) PAN: trước đây chia delta cho currentScale khiến khi zoom > 1 thì
 *        canvas di chuyển chậm hơn chuột. scrollLeft/Top là pixel màn hình nên
 *        KHÔNG được chia cho scale.
 *    (2) ZOOM: trước đây tính lại toạ độ sau khi đã đổi scale nên điểm dưới
 *        con trỏ bị trôi. Nay tính toạ độ canvas TRƯỚC khi zoom, sau đó suy ra
 *        scrollLeft/Top mới để giữ nguyên điểm neo dưới con trỏ.
 *    (3) Khung cuộn được cập nhật kích thước qua applyWorkspaceScale() nên có
 *        thể cuộn tới toàn bộ nội dung ở mọi mức zoom.
 *  Ghi chú cho AI:
 *    - Nhánh CẢM ỨNG chỉ chạy khi pointerType = 'touch' / 'pen'. Nhánh chuột
 *      cũ giữ nguyên 100% ⇒ không ảnh hưởng trải nghiệm trên máy tính.
 *    - Khi nhánh cảm ứng gọi preventDefault() trên 'pointerdown', trình duyệt
 *      không bắn thêm sự kiện chuột tương thích ⇒ không bị xử lý 2 lần.
 * ========================================================================== */


/* ------------------------------------------------------------
 *  4. KÉO TỪ DANH SÁCH, PAN & ZOOM
 * ------------------------------------------------------------ */

/**
 * Gắn sự kiện kéo thả (HTML5 Drag & Drop) cho các khối mẫu trong danh sách.
 */
function setupBlockListDrag() {
    const items = DOM.blockList.querySelectorAll('.block-item');

    items.forEach(function (item) {
        item.addEventListener('dragstart', function (e) {
            // Lưu loại khối đang kéo
            e.dataTransfer.setData('text/plain', item.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
            item.style.opacity = '0.5';
        });

        item.addEventListener('dragend', function () {
            item.style.opacity = '1';
        });
    });

    // Cho phép thả khối đang kéo (từ workspace) trở lại danh sách để xóa
    DOM.blockList.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'delete';
        DOM.blockList.style.background = '#ffe9e9';
    });

    DOM.blockList.addEventListener('dragleave', function () {
        DOM.blockList.style.background = '';
    });

    DOM.blockList.addEventListener('drop', function (e) {
        e.preventDefault();
        DOM.blockList.style.background = '';
    });
}

/**
 * Gắn sự kiện thả khối vào vùng làm việc.
 */
function setupWorkspaceDrop() {
    DOM.workspace.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    DOM.workspace.addEventListener('drop', function (e) {
        e.preventDefault();

        const type = e.dataTransfer.getData('text/plain');
        if (!type || !BLOCK_TYPES[type]) return;

        // Tính toạ độ thả chính xác theo hệ số zoom hiện tại
        const pos = toCanvasCoords(e.clientX, e.clientY);

        // Nếu không lấy được toạ độ (một số trình duyệt không cung cấp) => thả vào giữa vùng xem
        if (!isFinite(pos.x) || !isFinite(pos.y)) {
            pos.x = Math.max(0, (DOM.workspace.scrollLeft + DOM.workspace.clientWidth / 2) / currentScale - 100);
            pos.y = Math.max(0, (DOM.workspace.scrollTop + DOM.workspace.clientHeight / 2) / currentScale - 40);
        }

        // Lệch nhẹ vị trí khi thả nhiều khối liên tiếp để không bị chồng lên nhau
        const offset = (blocks.length % 5) * 28;
        pos.x += offset;
        pos.y += offset;

        createBlock(type, pos.x, pos.y);
    });
}

/**
 * Gắn cơ chế kéo (nhấn giữ chuột trái) để di chuyển toàn bộ vùng làm việc.
 */
function setupPan() {
    let isPanning = false;
    let startX = 0, startY = 0;
    let startScrollLeft = 0, startScrollTop = 0;

    DOM.workspace.addEventListener('mousedown', function (e) {
        // Chỉ pan khi bấm vào nền trống (không bấm vào khối)
        const onBackground = e.target === DOM.workspace
            || e.target === DOM.canvas
            || e.target === DOM.content;
        if (!onBackground) return;

        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = DOM.workspace.scrollLeft;
        startScrollTop = DOM.workspace.scrollTop;

        DOM.workspace.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isPanning) return;

        // KHÔNG chia cho currentScale: scrollLeft/Top tính bằng pixel màn hình,
        // nên công thức đúng ở mọi mức zoom (đây là lỗi đã sửa ở bản 2.0).
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        DOM.workspace.scrollLeft = startScrollLeft - dx;
        DOM.workspace.scrollTop = startScrollTop - dy;
    });

    document.addEventListener('mouseup', function () {
        if (!isPanning) return;
        isPanning = false;
        DOM.workspace.style.cursor = '';
    });
}

/**
 * Gắn cơ chế phóng to / thu nhỏ bằng tổ hợp Ctrl + lăn chuột.
 *
 * Thuật toán giữ điểm neo (zoom-at-cursor) - đã sửa lỗi bản 1.0:
 *   1. Đổi con trỏ chuột sang toạ độ canvas TRƯỚC khi zoom:
 *        x = (clientX - wsRect.left + scrollLeft) / scaleCũ
 *   2. Cập nhật scale mới rồi áp dụng (applyWorkspaceScale).
 *   3. Chọn scrollLeft/Top sao cho điểm x vẫn nằm ngay dưới con trỏ:
 *        scrollLeft = x * scaleMới - (clientX - wsRect.left)
 */
function setupZoom() {
    DOM.workspace.addEventListener('wheel', function (e) {
        if (!e.ctrlKey) return;    // Chỉ zoom khi giữ Ctrl

        e.preventDefault();        // Tắt zoom mặc định của trình duyệt

        const contentRect = DOM.content.getBoundingClientRect();

        // (1) Toạ độ canvas dưới con trỏ, tính theo mức zoom HIỆN TẠI
        const canvasX = (e.clientX - contentRect.left) / currentScale;
        const canvasY = (e.clientY - contentRect.top) / currentScale;

        // (2) Cập nhật mức zoom (bước 0.1, giới hạn 0.4 .. 2)
        if (e.deltaY < 0) {
            currentScale = Math.min(currentScale + 0.1, 2);
        } else {
            currentScale = Math.max(currentScale - 0.1, 0.4);
        }
        currentScale = Math.round(currentScale * 10) / 10;   // tránh sai số 0.30000004
        applyWorkspaceScale();

        // (3) Giữ nguyên điểm neo dưới con trỏ.
        //     rect.left ban đầu KHÔNG đổi khi transform (origin 0 0), nên chỉ cần
        //     so vị trí mới của điểm neo với vị trí con trỏ là ra độ lệch scroll.
        const afterX = contentRect.left + canvasX * currentScale;
        const afterY = contentRect.top + canvasY * currentScale;

        DOM.workspace.scrollLeft += afterX - e.clientX;
        DOM.workspace.scrollTop += afterY - e.clientY;

        // Ghi lại mức zoom lên thuộc tính data-zoom để test/DevTools dễ kiểm tra
        DOM.content.dataset.zoom = String(currentScale);
        DOM.workspace.dataset.zoom = String(currentScale);
    }, { passive: false });
}


/* ==========================================================================
 *  5. HỖ TRỢ THAO TÁC CẢM ỨNG (bản 2.7 — giao diện điện thoại)
 * --------------------------------------------------------------------------
 *  Ba kỹ thuật được dùng:
 *    (a) CHẠM-ĐẶT   : chạm 1 lần vào khối mẫu ⇒ thêm khối vào vùng làm việc.
 *                       Đây là cách nhanh nhất trên điện thoại.
 *    (b) KÉO CẢM ỨNG: giữ ngón tay trên khối mẫu rồi di chuyển ⇒ một "bóng
 *                       ma" bám theo ngón tay; thả xuống vùng làm việc để đặt
 *                       khối đúng vị trí.
 *    (c) PAN / PINCH : chạm & kéo trên nền trống ⇒ di chuyển vùng làm việc;
 *                       vé 2 ngón ⇒ phóng to / thu nhỏ quanh tâm 2 ngón.
 *
 *  Mọi hàm ở đây đều là hàm toàn cục để dùng chung được với module khác.
 * ========================================================================== */

/** Ngưỡng (px) để phân biệt "chạm" với "kéo" trên cảm ứng */
var TOUCH_MOVE_THRESHOLD = 10;

/** Thời gian (ms) giữ ngón tay để bắt đầu KÉO (nếu giữ lâu hơn thì kéo) */
var TOUCH_HOLD_DELAY = 220;

/**
 * Tạo bóng ma (bản sao) của khối mẫu để bám theo ngón tay khi kéo.
 *
 * @param {HTMLElement} source - phần tử khối mẫu gốc
 * @returns {HTMLElement} phần tử bóng ma đã gắn vào document.body
 */
function createTouchGhost(source) {
    const meta = BLOCK_TYPES[source.dataset.type];
    const ghost = document.createElement('div');
    ghost.className = 'touch-drag-ghost';
    ghost.textContent = (meta ? meta.icon + ' ' + meta.label : source.textContent);
    if (meta && source.dataset.type) {
        // Giữ đúng màu nhận diện của loại câu hỏi như trên máy tính
        const colorMap = {
            'multiple-choice': '#4c97ff', 'ordering': '#ffab19',
            'matching': '#9966ff', 'hotspot': '#ff6680',
            'cloze': '#cf63cf', 'dropdown': '#ff7b8b'
        };
        ghost.style.background = colorMap[source.dataset.type] || '#4c97ff';
    }
    document.body.appendChild(ghost);
    return ghost;
}

/**
 * Đặt khối mới vào vùng làm việc tại toạ độ cho trước.
 * Dùng chung cho cả nhánh cảm ứng và nhánh chuột để hành vi giống nhau.
 *
 * @param {string} type - loại khối (key của BLOCK_TYPES)
 * @param {number} clientX - toạ độ X theo viewport
 * @param {number} clientY - toạ độ Y theo viewport
 */
function addBlockAtViewport(type, clientX, clientY) {
    if (!type || !BLOCK_TYPES[type]) return;

    // Tính toạ độ thả chính xác theo hệ số zoom hiện tại
    const pos = toCanvasCoords(clientX, clientY);

    // Nếu không lấy được toạ độ ⇒ thả vào giữa vùng xem
    if (!isFinite(pos.x) || !isFinite(pos.y)) {
        pos.x = Math.max(0, (DOM.workspace.scrollLeft + DOM.workspace.clientWidth / 2) / currentScale - 100);
        pos.y = Math.max(0, (DOM.workspace.scrollTop + DOM.workspace.clientHeight / 2) / currentScale - 40);
    }

    // Lệch nhẹ vị trí khi thả nhiều khối liên tiếp để không bị chồng lên nhau
    const offset = (blocks.length % 5) * 28;
    pos.x += offset;
    pos.y += offset;

    createBlock(type, pos.x, pos.y);
}




/**
 * Gắn toàn bộ thao tác cảm ứng cho vùng làm việc và danh sách khối mẫu.
 *
 * - Chạm 1 lần vào khối mẫu  : thêm khối vào vùng làm việc.
 * - Giữ & kéo khối mẫu      : kéo bóng ma, thả xuống vùng làm việc.
 * - Chạm & kéo nền trống     : pan vùng làm việc.
 * - Vé 2 ngón                : pinch-zoom quanh tâm 2 ngón.
 */
function setupTouchSupport() {
    if (!DOM.workspace || !DOM.blockList) return;
    if (setupTouchSupport._done) return;      // không gắn trùng
    setupTouchSupport._done = true;

    /* ------------------------------------------------------------
     *  A. KÉO KHỐI MẪU TỪ TOOLBOX (kéo cảm ứng + chạm-đặt)
     * ------------------------------------------------------------ */
    const items = DOM.blockList.querySelectorAll('.block-item');

    items.forEach(function (item) {
        let holdTimer = null;
        let dragging = false;      // đang kéo bóng ma
        let moved = false;         // đã di chuyển quá ngưỡng
        let ghost = null;
        let startX = 0, startY = 0;
        let type = '';

        function moveGhost(x, y) {
            if (!ghost) return;
            ghost.style.left = x + 'px';
            ghost.style.top = y + 'px';
        }

        function onPointerDown(e) {
            // Bỏ qua sự kiện do chuột sinh ra ⇒ nhánh chuột cũ lo phần này
            if (!isTouchPointerEvent(e)) return;

            type = item.dataset.type;
            if (!type || !BLOCK_TYPES[type]) return;

            startX = e.clientX;
            startY = e.clientY;
            moved = false;
            dragging = false;

            // Giữ ngón tay: sau một khoảng thời gian thì bắt đầu kéo
            holdTimer = setTimeout(function () {
                dragging = true;
                ghost = createTouchGhost(item);
                moveGhost(startX, startY);
                if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* bỏ qua */ } }
            }, TOUCH_HOLD_DELAY);

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        }

        function onPointerMove(e) {
            if (!isTouchPointerEvent(e)) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Ngón tay đã di chuyển đủ xa trước khi bộ đếm giữ kịp chạy
            // ⇒ huỷ chế độ kéo, coi như một cú chạm đơn giản.
            if (!dragging && Math.abs(dx) + Math.abs(dy) > TOUCH_MOVE_THRESHOLD) {
                clearTimeout(holdTimer);
                holdTimer = null;
                moved = true;
            }

            if (dragging) {
                moveGhost(e.clientX, e.clientY);
                // Báo hiệu vùng làm việc đang sẵn sàng nhận khối
                DOM.workspace.classList.add('is-touch-drop-target');
            }
        }

        function onPointerUp(e) {
            clearTimeout(holdTimer);
            holdTimer = null;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            DOM.workspace.classList.remove('is-touch-drop-target');

            if (ghost) {
                ghost.remove();
                ghost = null;
            }

            if (dragging) {
                // Thả khung: nếu ngón tay nằm trong vùng làm việc ⇒ tạo khối
                const rect = DOM.workspace.getBoundingClientRect();
                const inside = e.clientX >= rect.left && e.clientX <= rect.right
                    && e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (inside) addBlockAtViewport(type, e.clientX, e.clientY);
                dragging = false;
                return;
            }

            // Chạm nhanh (không kéo, không di chuyển) ⇒ thêm khối ngay
            if (!moved) {
                addBlockAtViewport(type, e.clientX, e.clientY);
            }
        }

        item.addEventListener('pointerdown', onPointerDown);
    });


    /* ------------------------------------------------------------
     *  B. BỘ ĐIỀU KHIỂN CỬ CHỈ CẢM ỨNG TRÊN WORKSPACE (bản 2.7)
     *  ------------------------------------------------------------------------
     *  Quy tắc (đúng như yêu cầu):
     *    · 1 NGÓN trên một khối câu hỏi (.dropped-block)
     *        ⇒ CHỈ di chuyển khối đó, TUYỆT ĐỐI không pan vùng làm việc.
     *    · 1 NGÓN trên nền trống
     *        ⇒ pan (trượt) vùng làm việc.
     *    · 2 NGÓN:
     *        – vuốt CÙNG CHIỀU          ⇒ PAN (vùng làm việc đi theo ngón tay)
     *        – vuốt TÁCH RA / TÚM LẠI   ⇒ ZOOM (pinch) quanh tâm cử chỉ
     *      Hai hiệu ứng được tính TOÀN CỘP nên có thể vừa pan vừa zoom
     *      rất mượt, không xung đột với nhau.
     *
     *  VÌ SAO LẮNG NGHE Ở `document`?
     *    Sự kiện pointermove luôn được gửi tới phần tử nằm dưới ngón tay.
     *    Khi ngón tay kéo ra ngoài khối (hoặc ra ngoài vùng làm việc), sự kiện
     *    vẫn phải tiếp tục được nhận để khối không bị "rơi" giữa chừng.
     *    Vì vậy move/up được lắng nghe ở `document`, còn pointerdown gắn ở
     *    vùng làm việc để biết thao tác bắt đầu ở đâu.
     *
     *  CHẶN ZOOM MẶC ĐỊNH CỦA TRÌNH DUYỆT:
     *    Được xử lý bằng CSS `touch-action: none` trên #workspace-pane
     *    (xem css/responsive.css). Nhờ đó trình duyệt không tự phóng to /
     *    cuộn trang khi người dùng vuốt trên vùng làm việc ⇒ cử chỉ của
     *    chúng ta kiểm soát hoàn toàn, không bị xung đột.
     * ------------------------------------------------------------ */

    // Các điểm chạm đang hoạt động: pointerId → { x, y }
    const activePointers = new Map();

    // Chế độ cử chỉ hiện tại
    var GESTURE_NONE = 'none';    // không có cử chỉ nào
    var GESTURE_BLOCK = 'block';  // 1 ngón đang kéo một khối câu hỏi
    var GESTURE_PAN = 'pan';      // 1 ngón đang pan nền trống
    var GESTURE_PINCH = 'pinch';  // 2 ngón đang pan + zoom

    var gesture = GESTURE_NONE;

    // Thông tin khi kéo khối bằng 1 ngón
    var blockDrag = null;

    // Thông tin khi dùng 2 ngón (pan + zoom)
    var pinch = null;

    // Thông tin khi pan vùng làm việc bằng 1 ngón trên nền trống
    var panStartX = 0, panStartY = 0;
    var panScrollLeft = 0, panScrollTop = 0;

    /**
     * Tìm khối câu hỏi nằm dưới con trỏ.
     * @param {EventTarget} target - đích của sự kiện
     * @returns {{el:HTMLElement, block:Object}|null} khối tìm thấy
     */
    function findBlockUnder(target) {
        if (!target || !target.closest) return null;
        const el = target.closest('.dropped-block');
        if (!el) return null;
        const block = blocks.find(function (b) { return b.id === el.dataset.id; });
        return block ? { el: el, block: block } : null;
    }

    /**
     * Trả khối về vị trí cũ (dùng khi người dùng chuyển từ kéo 1 ngón sang
     * cử chỉ 2 ngón ⇒ thao tác kéo khối bị bỏ qua).
     */
    function revertBlockDrag() {
        if (!blockDrag) return;
        blockDrag.block.x = blockDrag.originX;
        blockDrag.block.y = blockDrag.originY;
        blockDrag.el.style.left = blockDrag.block.x + 'px';
        blockDrag.el.style.top = blockDrag.block.y + 'px';
        blockDrag.el.classList.remove('is-touch-dragging');
        blockDrag = null;
    }

    /* --- Bắt đầu cử chỉ --- */
    DOM.workspace.addEventListener('pointerdown', function (e) {
        if (!isTouchPointerEvent(e)) return;

        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        /* --- Đã có 2 ngón ⇒ chuyển sang chế độ PAN + ZOOM --- */
        if (activePointers.size === 2) {
            // Bỏ dở thao tác kéo khối (nếu có) và trả khối về chỗ cũ
            revertBlockDrag();

            const pts = Array.from(activePointers.values());
            pinch = {
                startDistance: pointerDistance(pts[0], pts[1]),
                startMid: pointerMidpoint(pts[0], pts[1]),
                startScale: currentScale
            };
            gesture = GESTURE_PINCH;
            return;
        }

        if (activePointers.size > 2) return;

        /* --- 1 ngón: bắt đầu kéo khối nếu chạm vào khối câu hỏi --- */
        const hit = findBlockUnder(e.target);

        // Chạm vào thành phần tương tác bên trong khối (nút ⚙️, ô nhập...) ⇒
        // để trình duyệt xử lý bình thường, KHÔNG kéo và KHÔNG pan.
        if (hit && e.target.closest('button, input, textarea, select')) {
            gesture = GESTURE_NONE;
            return;
        }

        if (hit) {
            blockDrag = {
                el: hit.el,
                block: hit.block,
                originX: hit.block.x,
                originY: hit.block.y,
                startX: e.clientX,
                startY: e.clientY,
                moved: false
            };
            hit.el.classList.add('is-touch-dragging');
            gesture = GESTURE_BLOCK;

            // Ngăn trình duyệt sinh sự kiện chuột tương thích (mouse event)
            // ⇒ khối không bị xử lý 2 lần (1 lần bằng cảm ứng, 1 lần bằng chuột).
            e.preventDefault();
            return;
        }

        /* --- 1 ngón trên nền trống ⇒ pan vùng làm việc --- */
        gesture = GESTURE_PAN;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panScrollLeft = DOM.workspace.scrollLeft;
        panScrollTop = DOM.workspace.scrollTop;

        // Ngăn trình duyệt sinh sự kiện chuột tương thích ⇒ không bị pan 2 lần
        e.preventDefault();
    });

    /* Lắng nghe di chuyển ở `document` để theo dõi cả khi ngón tay rời khối */
    document.addEventListener('pointermove', function (e) {
        if (!isTouchPointerEvent(e)) return;

        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        /* --- CỬ CHỈ 2 NGÓN: PAN + ZOOM cùng lúc --- */
        if (gesture === GESTURE_PINCH && activePointers.size >= 2 && pinch) {
            const pts = Array.from(activePointers.values());
            const newDistance = pointerDistance(pts[0], pts[1]);
            const newMid = pointerMidpoint(pts[0], pts[1]);

            if (pinch.startDistance > 0 && newDistance > 0) {
                /* --- PHẦN ZOOM: tỉ lệ khoảng cách 2 ngón --- */
                const factor = newDistance / pinch.startDistance;
                const nextScale = Math.round(
                    Math.min(2, Math.max(0.4, pinch.startScale * factor)) * 10
                ) / 10;

                if (nextScale !== currentScale) {
                    // Toạ độ canvas dưới tâm 2 ngón, tính theo mức zoom HIỆN TẠI
                    const contentRect = DOM.content.getBoundingClientRect();
                    const canvasX = (pinch.startMid.x - contentRect.left) / currentScale;
                    const canvasY = (pinch.startMid.y - contentRect.top) / currentScale;

                    currentScale = nextScale;
                    applyWorkspaceScale();

                    // Giữ điểm neo (tâm 2 ngón) tại vị trí cũ
                    const afterX = contentRect.left + canvasX * currentScale;
                    const afterY = contentRect.top + canvasY * currentScale;
                    DOM.workspace.scrollLeft += afterX - pinch.startMid.x;
                    DOM.workspace.scrollTop += afterY - pinch.startMid.y;
                }

                /* --- PHẦN PAN: tâm 2 ngón dịch chuyển --- */
                DOM.workspace.scrollLeft += newMid.x - pinch.startMid.x;
                DOM.workspace.scrollTop += newMid.y - pinch.startMid.y;

                // Cập nhật điểm xuất phát để lần sau tính tiếp từ vị trí mới
                pinch.startMid = newMid;
                pinch.startDistance = newDistance;
                pinch.startScale = currentScale;
            }

            e.preventDefault();
            return;
        }

        /* --- CỬ CHỈ 1 NGÓN: KÉO KHỐI (tuyệt đối không pan) --- */
        if (gesture === GESTURE_BLOCK && blockDrag) {
            const dx = (e.clientX - blockDrag.startX) / currentScale;
            const dy = (e.clientY - blockDrag.startY) / currentScale;

            if (!blockDrag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
            blockDrag.moved = true;

            blockDrag.block.x = blockDrag.originX + dx;
            blockDrag.block.y = blockDrag.originY + dy;
            blockDrag.el.style.left = blockDrag.block.x + 'px';
            blockDrag.el.style.top = blockDrag.block.y + 'px';

            expandCanvasIfNeeded(blockDrag.block.y);
            toggleDeleteZoneHighlight(isOverDeleteZone(e.clientX, e.clientY));
            e.preventDefault();
            return;
        }

        /* --- CỬ CHỈ 1 NGÓN: PAN nền trống --- */
        if (gesture === GESTURE_PAN) {
            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            DOM.workspace.scrollLeft = panScrollLeft - dx;
            DOM.workspace.scrollTop = panScrollTop - dy;
            e.preventDefault();
        }
    });

    /**
     * Kết thúc một cử chỉ cảm ứng.
     * @param {PointerEvent} e - sự kiện pointerup / pointercancel
     */
    function endTouchPointer(e) {
        if (!isTouchPointerEvent(e)) return;
        activePointers.delete(e.pointerId);

        /* --- Kết thúc kéo khối bằng 1 ngón --- */
        if (gesture === GESTURE_BLOCK && blockDrag) {
            const drag = blockDrag;
            blockDrag = null;
            drag.el.classList.remove('is-touch-dragging');
            toggleDeleteZoneHighlight(false);

            // Thả ra ngoài vùng làm việc hoặc lên vùng xoá ⇒ xoá khối
            if (drag.moved && (isOverDeleteZone(e.clientX, e.clientY)
                || isOutsideWorkspace(e.clientX, e.clientY))) {
                removeBlock(drag.block);
            } else if (drag.moved) {
                sortBlocksByPosition();
                refreshStageAndProperties();
            }
        }

        /* --- Còn đúng 2 ngón thì giữ nguyên chế độ pinch --- */
        if (activePointers.size < 2) {
            pinch = null;
            if (activePointers.size === 0) gesture = GESTURE_NONE;
        }
    }

    /* Lắng nghe kết thúc cử chỉ (đặt sau khi đã định nghĩa endTouchPointer) */
    document.addEventListener('pointerup', endTouchPointer);
    document.addEventListener('pointercancel', endTouchPointer);
}

