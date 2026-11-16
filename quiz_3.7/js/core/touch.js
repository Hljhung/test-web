/* ============================================================================
 *  MODULE: js/core/touch.js — TIỆN ÍCH HỖ TRỢ THAO TÁC CẢM ỨNG (bản 2.7)
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - isTouchDevice()      : biết thiết bị có hỗ trợ cảm ứng hay không.
 *    - isTouchPointerEvent(): biết một sự kiện Pointer do ngón tay sinh ra.
 *    - pointerDistance()    : khoảng cách giữa hai điểm (dùng cho pinch-zoom).
 *    - pointerMidpoint()    : điểm giữa của hai điểm.
 *
 *  VÌ SAO CẦN MODULE NÀY?
 *    Trên điện thoại, HTML5 Drag & Drop KHÔNG hoạt động, còn các sự kiện
 *    chuột (mouse) chỉ được trình duyệt "mô phỏng" và thường không kéo
 *    được. Vì vậy mọi thao tác kéo trong dự án đều được bổ sung thêm một
 *    nhánh Pointer Events, chỉ chạy khi con trỏ là ngón tay.
 *
 *  QUY TẮC AN TOÀN:
 *    - Nhánh Pointer Events CHỈ dùng cho pointerType = 'touch' / 'pen'.
 *      Nhánh chuột cũ giữ nguyên 100% ⇒ không ảnh hưởng trải nghiệm desktop.
 *    - Khi nhánh cảm ứng gọi preventDefault() trên 'pointerdown', trình duyệt
 *      sẽ KHÔNG bắn thêm sự kiện chuột tương thích ⇒ không bị xử lý 2 lần.
 *
 *  Ghi chú cho AI: file này chỉ chứa HÀM, không khai báo biến toàn cục mới,
 *  và phải được nạp TRƯỚC js/workspace/*, js/coding/*, js/player/*.
 * ========================================================================== */


/* ------------------------------------------------------------
 *  TIỆN ÍCH CẢM ỨNG
 * ------------------------------------------------------------ */

/**
 * Kiểm tra thiết bị hiện tại có hỗ trợ cảm ứng hay không.
 * Dùng để BẬT thêm các thao tác chạm-đặt (chỉ có ý nghĩa trên cảm ứng).
 *
 * @returns {boolean} true nếu thiết bị có màn hình cảm ứng
 */
function isTouchDevice() {
    if (typeof window === 'undefined') return false;
    if ('ontouchstart' in window) return true;
    if (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0) return true;
    return false;
}

/**
 * Kiểm tra một sự kiện Pointer có do ngón tay (hoặc bút) sinh ra hay không.
 * Sự kiện do chuột sinh ra (pointerType = 'mouse') trả về false để giữ nguyên
 * đường chạy chuột cũ.
 *
 * @param {PointerEvent} e - sự kiện cần kiểm tra
 * @returns {boolean} true nếu đây là sự kiện cảm ứng
 */
function isTouchPointerEvent(e) {
    if (!e) return false;
    if (typeof e.pointerType !== 'string') return false;   // trình duyệt rất cũ
    return e.pointerType === 'touch' || e.pointerType === 'pen';
}

/**
 * Lấy toạ độ X/Y từ một điểm chạm.
 *
 * Hàm chấp nhận CẢ HAI dạng dữ liệu để tiện sử dụng:
 *    · { clientX, clientY } — dạng gốc của sự kiện Pointer/Mouse
 *    · { x, y }             — dạng rút gọn do ứng dụng tự tạo
 *
 * @param {{clientX:number, clientY:number}|{x:number, y:number}} p - điểm cần đọc
 * @returns {{x:number, y:number}} toạ độ chuẩn hoá
 */
function pointerPoint(p) {
    if (!p) return { x: 0, y: 0 };
    if (typeof p.clientX === 'number') return { x: p.clientX, y: p.clientY };
    return { x: p.x || 0, y: p.y || 0 };
}

/**
 * Khoảng cách (px) giữa hai điểm chạm — dùng để tính tỉ lệ pinch-zoom.
 *
 * @param {{clientX:number, clientY:number}|{x:number, y:number}} a - điểm thứ nhất
 * @param {{clientX:number, clientY:number}|{x:number, y:number}} b - điểm thứ hai
 * @returns {number} khoảng cách giữa hai điểm
 */
function pointerDistance(a, b) {
    const p1 = pointerPoint(a);
    const p2 = pointerPoint(b);
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Điểm giữa của hai điểm chạm — dùng làm tâm khi pinch-zoom.
 *
 * @param {{clientX:number, clientY:number}|{x:number, y:number}} a - điểm thứ nhất
 * @param {{clientX:number, clientY:number}|{x:number, y:number}} b - điểm thứ hai
 * @returns {{x:number, y:number}} toạ độ điểm giữa
 */
function pointerMidpoint(a, b) {
    const p1 = pointerPoint(a);
    const p2 = pointerPoint(b);
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
    };
}
