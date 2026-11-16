/* ============================================================================
 *  MODULE: js/mobile/mobile-store.js — LƯU TỰ ĐỘNG & TRẠNG THÁI LƯU (bản 2.8)
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - autoSave()        : lưu dự án vào localStorage sau mỗi thay đổi (trễ).
 *    - getSaveState()    : trạng thái hiện tại: 'idle' | 'saving' | 'saved' | 'error'.
 *    - subscribeSaveState(): đăng ký hàm nhận thông báo khi trạng thái đổi.
 *
 *  VÌ SAO CẦN MODULE NÀY?
 *    Trên điện thoại, người dùng không có "File → Lưu" rõ ràng như trên PC và
 *    dễ vô tình đóng tab. Do đó bản mobile cần TỰ ĐỘNG LƯU sau mỗi thay đổi.
 *
 *  QUY TẮC ĐỒNG BỘ GIỮA PC VÀ ĐIỆN THOẠI:
 *    - Dữ liệu lưu dùng CHUNG hàm serializeProject() / deserializeProject()
 *      đã có sẵn trong js/app/app.js ⇒ cùng một định dạng JSON, cùng cấu trúc
 *      `blocks[]`, cùng `data.program` cho kịch bản lập trình khối.
 *    - Khoá localStorage dùng CHUNG ⇒ điện thoại và PC (cùng trình duyệt,
 *      cùng tên miền) đọc thấy cùng một dự án.
 *    - KHÔNG tạo hệ thống dữ liệu riêng cho mobile.
 *
 *  Ghi chú cho AI: module này chỉ chứa hàm + một vài biến trạng thái riêng,
 *  và được nạp SAU js/app/app.js (vì cần gọi serializeProject / saveProject).
 * ========================================================================== */


/* ------------------------------------------------------------
 *  TRẠNG THÁI LƯU
 * ------------------------------------------------------------ */

/** Trạng thái lưu hiện tại: 'idle' | 'saving' | 'saved' | 'error' */
var mobileSaveState = 'idle';

/** Thông điệp lỗi gần nhất (nếu có) */
var mobileSaveError = '';

/** Danh sách hàm được gọi khi trạng thái lưu thay đổi */
var mobileSaveListeners = [];

/** Nhãn hiển thị cho từng trạng thái (tiếng Việt) */
var MOBILE_SAVE_LABELS = {
    idle: '',
    saving: 'Đang lưu…',
    saved: 'Đã lưu',
    error: 'Lỗi lưu'
};

/**
 * Đăng ký hàm được gọi mỗi khi trạng thái lưu thay đổi.
 * @param {Function} fn - hàm nhận đối số { state, label, error }
 */
function subscribeSaveState(fn) {
    if (typeof fn === 'function' && mobileSaveListeners.indexOf(fn) === -1) {
        mobileSaveListeners.push(fn);
    }
}

/**
 * Lấy trạng thái lưu hiện tại.
 * @returns {{state:string, label:string, error:string}} thông tin trạng thái
 */
function getSaveState() {
    return {
        state: mobileSaveState,
        label: MOBILE_SAVE_LABELS[mobileSaveState] || '',
        error: mobileSaveError
    };
}

/**
 * Đặt trạng thái lưu và báo cho các hàm đã đăng ký.
 * @param {string} state - 'idle' | 'saving' | 'saved' | 'error'
 * @param {string} [error] - thông điệp lỗi (khi state = 'error')
 */
function setSaveState(state, error) {
    mobileSaveState = state;
    mobileSaveError = error || '';
    var info = getSaveState();
    mobileSaveListeners.forEach(function (fn) {
        try { fn(info); } catch (e) { /* bỏ qua lỗi của listener */ }
    });
}

/**
 * Lưu dự án vào bộ nhớ trình duyệt (dùng chung hàm của PC).
 * @returns {boolean} true nếu lưu thành công
 */
function performSave() {
    try {
        if (typeof serializeProject !== 'function') {
            throw new Error('Không tìm thấy hàm serializeProject.');
        }
        if (typeof saveProjectToStorage !== 'function') {
            throw new Error('Không tìm thấy hàm saveProjectToStorage.');
        }
        saveProjectToStorage();
        setSaveState('saved');
        return true;
    } catch (e) {
        setSaveState('error', e && e.message ? e.message : String(e));
        return false;
    }
}

/* Bộ đếm thời gian chờ trước khi lưu (ms) */
var MOBILE_AUTOSAVE_DELAY = 600;

/** Đồng hồ đếm trễ cho auto-save */
var mobileSaveTimer = null;

/**
 * Lên lịch lưu tự động sau một khoảng thời gian ngắn.
 * Nhiều thay đổi liên tiếp sẽ được gộp lại thành một lần lưu.
 */
function scheduleAutoSave() {
    if (mobileSaveTimer) clearTimeout(mobileSaveTimer);
    setSaveState('saving');
    mobileSaveTimer = setTimeout(function () {
        mobileSaveTimer = null;
        performSave();
    }, MOBILE_AUTOSAVE_DELAY);
}

/**
 * Lưu ngay lập tức (không trễ) — dùng khi người dùng chủ động yêu cầu lưu.
 * @returns {boolean} true nếu lưu thành công
 */
function saveNow() {
    if (mobileSaveTimer) {
        clearTimeout(mobileSaveTimer);
        mobileSaveTimer = null;
    }
    return performSave();
}
