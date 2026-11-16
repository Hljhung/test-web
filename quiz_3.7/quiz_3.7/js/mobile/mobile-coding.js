/* ============================================================================
 *  MODULE: js/mobile/mobile-coding.js — MÀN HÌNH LẬP TRÌNH KHỐI TRÊN ĐIỆN THOẠI
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - mountMobileCoding(block, container) : dựng giao diện lập trình khối mobile.
 *    - closeMobileCodingScreen()          : đóng màn hình lập trình khối.
 *    - setupMobileCoding()                : gắn sự kiện.
 *
 *  NGUYÊN TẮC "KHÔNG ĐƠN GIẢN HOÁ LOGIC":
 *    Màn hình này dùng CHUNG engine `QuizCoding` và CHUNG mô hình dữ liệu
 *    `block.data.program` với PC. Nó cung cấp:
 *      · Workspace hiển thị 3 chồng lệnh (setup / correct / wrong).
 *      · Thư viện khối lệnh MỞ BẰNG BOTTOM SHEET (không chiếm cố định).
 *      · THÊM KHỐI bằng thao tác CHẠM (mặc định) — chạm khối trong thư viện
 *        rồi chạm vào vị trí cần chèn trong Workspace.
 *      · KÉO THẢ vẫn được hỗ trợ.
 *      · Chạy thử, phóng to/thu nhỏ, căn giữa workspace.
 *      · Kết quả chạy thử hiển thị ngay trên màn hình.
 *
 *  VỀ KHẢ NĂNG TẠO DỮ LIỆU NGẪU NHIÊN & SINH LỜI GIẢI:
 *    Không viết lại bất kỳ logic nào. `QuizCoding.runPreview()` của engine vẫn
 *    được gọi ⇒ tạo số ngẫu nhiên, tính toán, dùng biến và sinh lời giải
 *    hoạt động Y HỆT PC.
 * ========================================================================== */


/* ------------------------------------------------------------
 *  TRẠNG THÁI
 * ------------------------------------------------------------ */

/** Khối câu hỏi đang lập trình khối trên mobile */
var mobileCodingBlock = null;

/** Tham chiếu các phần tử của màn hình lập trình khối */
var MobileCodingDOM = {
    root: null,       // lớp phủ toàn màn hình
    title: null,      // tiêu đề
    workspace: null,  // vùng chứa 3 chồng lệnh
    output: null,     // vùng kết quả chạy thử
    palette: null,    // vùng thư viện khối (trong bottom sheet)
    zoomLabel: null   // nhãn hiển thị mức zoom
};

/** Mức zoom của workspace lập trình khối trên mobile */
var mobileCodingScale = 1;

/** Khối lệnh đang được chọn (chế độ chạm-đặt) */
var mobileCodingPick = null;

/* ------------------------------------------------------------
 *  KHUNG MÀN HÌNH
 * ------------------------------------------------------------ */

/**
 * Dựng khung màn hình lập trình khối mobile (chỉ một lần).
 */
function buildMobileCodingShell() {
    if (MobileCodingDOM.root) return;

    const root = htmlToElement(
        '<div class="mobile-coding" hidden>'
        + '  <header class="mobile-coding-header">'
        + '    <button type="button" class="mobile-icon-btn" data-mob-coding="back"'
        + '            aria-label="Quay lại">‹</button>'
        + '    <h2 class="mobile-coding-title">Lập trình khối</h2>'
        + '    <button type="button" class="mobile-icon-btn" data-mob-coding="run"'
        + '            title="Chạy thử" aria-label="Chạy thử">▶</button>'
        + '  </header>'
        + '  <div class="mobile-coding-toolbar">'
        + '    <button type="button" class="mobile-coding-tool" data-mob-coding="palette">'
        + '      🧩 Thư viện khối</button>'
        + '    <button type="button" class="mobile-coding-tool" data-mob-coding="zoom-out"'
        + '            aria-label="Thu nhỏ">－</button>'
        + '    <span class="mobile-coding-zoom" data-mob-zoom>100%</span>'
        + '    <button type="button" class="mobile-coding-tool" data-mob-coding="zoom-in"'
        + '            aria-label="Phóng to">＋</button>'
        + '    <button type="button" class="mobile-coding-tool" data-mob-coding="center"'
        + '            aria-label="Căn giữa">🎯</button>'
        + '  </div>'
        + '  <div class="mobile-coding-workspace" data-mob-coding-workspace></div>'
        + '  <div class="mobile-coding-output" data-mob-coding-output hidden></div>'
        + '</div>'
    );
    document.body.appendChild(root);

    MobileCodingDOM.root = root;
    MobileCodingDOM.title = root.querySelector('.mobile-coding-title');
    MobileCodingDOM.workspace = root.querySelector('[data-mob-coding-workspace]');
    MobileCodingDOM.output = root.querySelector('[data-mob-coding-output]');
    MobileCodingDOM.zoomLabel = root.querySelector('[data-mob-zoom]');
}

/**
 * Mở màn hình lập trình khối cho một câu hỏi.
 * @param {Object} block - khối câu hỏi
 * @param {HTMLElement} [container] - vùng chứa (mặc định: vùng trong trang cấu hình)
 */
function mountMobileCoding(block, container) {
    if (!block) return;

    buildMobileCodingShell();

    // Nếu có vùng chứa riêng (tab Lập trình khối của trang cấu hình) ⇒ dùng nó
    const host = container || MobileCodingDOM.workspace;
    mobileCodingBlock = block;

    // Dựng giao diện khối lệnh bằng bộ dựng CHUNG của PC (QuizCodingUI.mount)
    if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.mount) {
        try {
            QuizCodingUI.mount(host, block);
        } catch (e) {
            console.warn('QuizCodingUI.mount failed', e.message);
        }
    }

    // Trên điện thoại: ẩn bảng danh mục & thanh công cụ của PC
    // (dùng Bottom Sheet "Thư viện khối" và thanh công cụ riêng của mobile)
    if (host) {
        const pcPalette = host.querySelector('.coding-palette');
        if (pcPalette) pcPalette.style.display = 'none';
        const pcToolbar = host.querySelector('.coding-toolbar');
        if (pcToolbar) pcToolbar.style.display = 'none';
        const pcHint = host.querySelector('.coding-hint');
        if (pcHint) pcHint.remove();
    }

    // Nếu mở thành màn hình riêng (không nằm trong trang cấu hình) ⇒ hiện lớp phủ
    if (!container) {
        MobileCodingDOM.root.hidden = false;
        document.body.classList.add('mobile-coding-open');
    }

    // Chuẩn bị sẵn biến hệ thống + đồng bộ mức zoom
    if (typeof QuizCoding !== 'undefined' && QuizCoding.ensureProgram) {
        try { QuizCoding.ensureProgram(block.data); } catch (e) { /* bỏ qua */ }
    }
    setMobileCodingScale(1);
}

/**
 * Đóng màn hình lập trình khối mobile.
 * @param {boolean} [force] - true để đóng dù đang ở chế độ desktop
 * @returns {boolean} true nếu đã đóng
 */
function closeMobileCodingScreen(force) {
    if (!MobileCodingDOM.root || MobileCodingDOM.root.hidden) return false;
    if (!force && !isMobileView()) return false;

    MobileCodingDOM.root.hidden = true;
    document.body.classList.remove('mobile-coding-open');
    mobileCodingBlock = null;
    mobileCodingPick = null;
    return true;
}

/**
 * Đặt mức zoom của workspace lập trình khối.
 * @param {number} scale - hệ số zoom (0.5 .. 1.6)
 */
function setMobileCodingScale(scale) {
    mobileCodingScale = Math.min(1.6, Math.max(0.5, scale));
    const ws = mobileCodingWorkspace();
    if (ws) {
        ws.style.transform = 'scale(' + mobileCodingScale + ')';
        ws.style.transformOrigin = 'top left';
    }
    if (MobileCodingDOM.zoomLabel) {
        MobileCodingDOM.zoomLabel.textContent = Math.round(mobileCodingScale * 100) + '%';
    }
}

/**
 * Căn giữa workspace lập trình khối về giữa vùng hiển thị.
 */
function centerMobileCoding() {
    const ws = mobileCodingWorkspace();
    if (!ws) return;
    const scroller = ws.parentElement;
    if (!scroller) return;
    // Cuộn tới giữa theo chiều ngang và về đầu theo chiều dọc
    scroller.scrollLeft = Math.max(0, (ws.scrollWidth * mobileCodingScale - scroller.clientWidth) / 2);
    scroller.scrollTop = 0;
}

/**
 * Chạy thử chương trình khối lệnh và hiển thị kết quả.
 *
 * Dùng CHUNG `QuizCoding.runPreview()` của engine ⇒ kết quả (biến, câu hỏi
 * ngẫu nhiên, điểm, lời nhắn) giống hệt PC.
 */
function runMobileCodingPreview() {
    if (!mobileCodingBlock) return;

    let res = null;
    try {
        if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.preview) {
            res = QuizCodingUI.preview();
        } else if (typeof QuizCoding !== 'undefined' && QuizCoding.runPreview) {
            res = QuizCoding.runPreview(mobileCodingBlock);
        }
    } catch (e) {
        console.warn('Chạy thử lỗi:', e.message);
    }

    const out = mobileCodingOutputArea();
    if (!out) return;
    out.hidden = false;
    out.innerHTML = '';

    if (!res) {
        out.appendChild(htmlToElement('<div class="co-error">Không chạy được chương trình.</div>'));
        return;
    }
    if (res.error) {
        out.appendChild(htmlToElement(
            '<div class="co-error">' + escapeHtml(res.error) + '</div>'));
        return;
    }

    // Tiêu đề
    out.appendChild(htmlToElement('<div class="co-title">▶ Kết quả chạy thử</div>'));

    // Biến
    if (res.vars && Object.keys(res.vars).length) {
        const row = htmlToElement('<div class="co-row"><span class="co-label">Biến</span>'
            + '<span class="co-vars"></span></div>');
        const vars = row.querySelector('.co-vars');
        Object.keys(res.vars).forEach(function (k) {
            vars.appendChild(htmlToElement(
                '<span class="co-var">' + escapeHtml(k) + ' = '
                + escapeHtml(res.vars[k]) + '</span>'));
        });
        out.appendChild(row);
    }

    // Câu hỏi sau khi chạy chương trình
    if (res.question !== undefined && res.question !== null && res.question !== '') {
        out.appendChild(htmlToElement(
            '<div class="co-row"><span class="co-label">Nội dung</span>'
            + '<span class="co-text">' + escapeHtml(res.question) + '</span></div>'));
    }

    // Đáp án
    if (res.answer !== undefined && res.answer !== null && res.answer !== '') {
        out.appendChild(htmlToElement(
            '<div class="co-row"><span class="co-label">Đáp án</span>'
            + '<span class="co-text">' + escapeHtml(res.answer) + '</span></div>'));
    }

    // Điểm
    if (res.score !== undefined && res.score !== null) {
        out.appendChild(htmlToElement(
            '<div class="co-row"><span class="co-label">Điểm</span>'
            + '<span class="co-text"><span class="co-score">'
            + escapeHtml(res.score) + '</span></span></div>'));
    }

    // Lời nhắn
    if (res.message) {
        out.appendChild(htmlToElement(
            '<div class="co-row"><span class="co-label">Lời nhắn</span>'
            + '<span class="co-text">' + escapeHtml(res.message) + '</span></div>'));
    }

    // Nội dung chưa có gì
    if (!out.querySelector('.co-row')) {
        out.appendChild(htmlToElement(
            '<div class="co-empty">Chương trình không tạo ra kết quả nào.</div>'));
    }
}

/* ------------------------------------------------------------
 *  THƯ VIỆN KHỐI LỆNH (BOTTOM SHEET) + CHẠM-ĐẶT
 * ------------------------------------------------------------ */

/**
 * Mở Bottom Sheet thư viện khối lệnh.
 *
 * Thư viện được dựng lại từ engine `QuizCoding.CATEGORIES` / `QuizCoding.BLOCKS`
 * (cùng nguồn với PC) ⇒ không có bản sao riêng, không lệch danh mục.
 *
 * Cách dùng (chế độ CHẠM-ĐẶT — mặc định trên điện thoại):
 *   1. Bấm "🧩 Thư viện khối" ⇒ Bottom Sheet mở ra.
 *   2. Chạm vào một khối lệnh trong thư viện ⇒ khối đó được "chọn".
 *   3. Đóng sheet, chạm vào vị trí (khe) trong Workspace ⇒ khối được đặt vào đó.
 */
function openMobileCodingPalette() {
    if (!mobileCodingBlock) return;

    const content = htmlToElement('<div class="mobile-palette-groups"></div>');
    const groups = content.querySelector('.mobile-palette-groups');

    if (typeof QuizCoding === 'undefined') {
        groups.appendChild(htmlToElement(
            '<div class="co-empty">Không tải được thư viện khối lệnh.</div>'));
        openMobileSheet({ title: 'Thư viện khối lệnh', content: content });
        return;
    }

    // Dùng CHUNG danh mục + định nghĩa khối của engine
    QuizCoding.CATEGORIES.forEach(function (cat) {
        const section = htmlToElement(
            '<section class="mobile-palette-cat">'
            + '  <button type="button" class="mobile-palette-cat-head"'
            + '          style="--cat-color:' + cat.color + '">'
            + '    <span class="mobile-palette-cat-title">' + cat.icon + ' ' + escapeHtml(cat.label) + '</span>'
            + '    <span class="mobile-group-caret" aria-hidden="true">▾</span>'
            + '  </button>'
            + '  <div class="mobile-palette-cat-body"></div>'
            + '</section>'
        );
        const body = section.querySelector('.mobile-palette-cat-body');

        // Thu gọn / mở rộng nhóm khối
        section.querySelector('.mobile-palette-cat-head').addEventListener('click', function () {
            const open = section.classList.toggle('is-open');
            section.querySelector('.mobile-palette-cat-head')
                .setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        Object.keys(QuizCoding.BLOCKS).forEach(function (type) {
            const def = QuizCoding.BLOCKS[type];
            if (def.cat !== cat.id) return;
            const btn = htmlToElement(
                '<button type="button" class="mobile-palette-block"'
                + ' data-palette-type="' + type + '"'
                + ' style="--cat-color:' + cat.color + '">'
                + '  <span class="mobile-palette-block-text">'
                + escapeHtml(def.label) + '</span>'
                + '</button>'
            );
            body.appendChild(btn);
        });

        // Mặc định nhóm đầu tiên được mở
        if (cat === QuizCoding.CATEGORIES[0]) {
            section.classList.add('is-open');
            section.querySelector('.mobile-palette-cat-head')
                .setAttribute('aria-expanded', 'true');
        }
        groups.appendChild(section);
    });

    openMobileSheet({ title: 'Thư viện khối lệnh', content: content });

    // Chạm vào khối trong thư viện ⇒ chọn khối đó (chế độ chạm-đặt)
    content.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-palette-type]');
        if (!btn) return;

        // Dùng CHUNG API của coding-ui để chọn khối (cùng bộ quy tắc thả)
        if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.pickBlock) {
            QuizCodingUI.pickBlock(btn.dataset.paletteType);
        }
        mobileCodingPick = { mode: 'new', type: btn.dataset.paletteType };

        closeMobileSheet();
        showToast('🧩 Đã chọn khối. Chạm vào vị trí trong Workspace để đặt.');
        highlightMobileCodingTargets();
    });
}

/**
 * Lấy vùng workspace lập trình khối đang hoạt động.
 *
 * Có hai nơi có thể chứa giao diện khối lệnh:
 *   1. Tab "Lập trình khối" trong trang cấu hình mobile.
 *   2. Màn hình lập trình khối riêng (toàn màn hình).
 * Hàm này trả về vùng đang dùng để gắn sự kiện chạm-đặt & pinch-zoom.
 *
 * @returns {HTMLElement|null} vùng workspace, hoặc null nếu chưa dựng
 */
function mobileCodingWorkspace() {
    // Ưu tiên vùng nằm trong trang cấu hình (đang hoạt động)
    if (MobileEditorDOM && MobileEditorDOM.codePane) {
        const ws = MobileEditorDOM.codePane.querySelector('.coding-workspace');
        if (ws) return ws;
    }
    // Màn hình riêng
    if (MobileCodingDOM.workspace) {
        const ws = MobileCodingDOM.workspace.querySelector('.coding-workspace');
        if (ws) return ws;
    }
    return null;
}

/**
 * Lấy vùng hiển thị kết quả chạy thử đang hoạt động.
 * @returns {HTMLElement|null} vùng output, hoặc null nếu chưa dựng
 */
function mobileCodingOutputArea() {
    if (MobileEditorDOM && MobileEditorDOM.codePane) {
        const out = MobileEditorDOM.codePane.querySelector('.coding-output');
        if (out) return out;
    }
    return MobileCodingDOM.output;
}

/**
 * Làm nổi các vị trí có thể đặt khối lệnh đang chọn.
 */
function highlightMobileCodingTargets() {
    const host = mobileCodingWorkspace();
    if (!host) return;

    host.querySelectorAll('.is-touch-target').forEach(function (el) {
        el.classList.remove('is-touch-target');
    });
    if (!mobileCodingPick) return;

    // Dùng CHUNG bộ quy tắc thả của coding-ui: khe cho lệnh, ổ cho reporter
    host.querySelectorAll('.cb-gap').forEach(function (gap) {
        if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.canDropToGap
            && QuizCodingUI.canDropToGap(gap)) {
            gap.classList.add('is-touch-target');
        }
    });
    host.querySelectorAll('.cb-slot').forEach(function (slot) {
        if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.canDropToSlot
            && QuizCodingUI.canDropToSlot(slot)) {
            slot.classList.add('is-touch-target');
        }
    });
}

/**
 * Xử lý chạm vào vùng Workspace lập trình khối khi đang ở chế độ CHẠM-ĐẶT.
 *
 * Khi người dùng đã chọn một khối lệnh trong thư viện (Bottom Sheet), chạm vào
 * một khe (hoặc ổ nhập) trong Workspace sẽ đặt khối đó vào đúng vị trí đó.
 *
 * @param {Event} e - sự kiện chạm
 * @returns {boolean} true nếu đã đặt khối thành công
 */
function handleMobileCodingPick(e) {
    if (!mobileCodingPick) return false;
    if (typeof QuizCodingUI === 'undefined' || !QuizCodingUI.dropPickToGap) return false;

    const gap = e.target.closest('.cb-gap');
    if (gap && QuizCodingUI.dropPickToGap(gap)) {
        mobileCodingPick = null;
        highlightMobileCodingTargets();
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
        return true;
    }

    const slot = e.target.closest('.cb-slot');
    if (slot && QuizCodingUI.dropPickToSlot(slot)) {
        mobileCodingPick = null;
        highlightMobileCodingTargets();
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
        return true;
    }

    return false;
}

/* ------------------------------------------------------------
 *  GẮN SỰ KIỆN
 * ------------------------------------------------------------ */

/**
 * Gắn sự kiện cho màn hình lập trình khối mobile (chỉ gắn một lần).
 */
function setupMobileCoding() {
    buildMobileCodingShell();
    const root = MobileCodingDOM.root;
    if (!root || root.dataset.ready === '1') return;
    root.dataset.ready = '1';

    /* --- Các nút trên thanh công cụ --- */
    root.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mob-coding]');
        if (!btn) return;
        const action = btn.dataset.mobCoding;

        if (action === 'back') {
            closeMobileCodingScreen(true);
        } else if (action === 'run') {
            runMobileCodingPreview();
        } else if (action === 'palette') {
            openMobileCodingPalette();
        } else if (action === 'zoom-in') {
            setMobileCodingScale(mobileCodingScale + 0.1);
        } else if (action === 'zoom-out') {
            setMobileCodingScale(mobileCodingScale - 0.1);
        } else if (action === 'center') {
            centerMobileCoding();
        }
    });

    /* --- Chạm-đặt: chạm vào khe/ổ để đặt khối lệnh đang chọn --- */
    // Gắn sự kiện ở mức tài liệu (delegate) để áp dụng cho cả tab cấu hình
    // lẫn màn hình lập trình khối riêng.
    document.addEventListener('click', function (e) {
        if (!mobileCodingPick) return;
        const ws = mobileCodingWorkspace();
        if (!ws || !ws.contains(e.target)) return;
        if (handleMobileCodingPick(e)) {
            // Đã đặt khối xong ⇒ bỏ chọn
            mobileCodingPick = null;
        }
    });

    /* --- Vuốt 2 ngón để phóng to / thu nhỏ workspace lập trình khối --- */
    setupMobileCodingPinch();
}

/**
 * Gắn cử chỉ 2 ngón (pinch) cho workspace lập trình khối.
 */
function setupMobileCodingPinch() {
    if (window.__mobileCodingPinchReady) return;
    window.__mobileCodingPinchReady = true;

    const pointers = new Map();
    let startDistance = 0;
    let startScale = 1;

    document.addEventListener('pointerdown', function (e) {
        if (!isTouchPointerEvent(e)) return;
        const ws = mobileCodingWorkspace();
        if (!ws || !ws.contains(e.target)) return;

        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
            const pts = Array.from(pointers.values());
            startDistance = pointerDistance(pts[0], pts[1]);
            startScale = mobileCodingScale;
        }
    });

    document.addEventListener('pointermove', function (e) {
        if (!isTouchPointerEvent(e)) return;
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size !== 2 || startDistance <= 0) return;

        const pts = Array.from(pointers.values());
        const newDistance = pointerDistance(pts[0], pts[1]);
        if (newDistance <= 0) return;

        setMobileCodingScale(startScale * (newDistance / startDistance));
        e.preventDefault();
    });

    function endPointer(e) {
        if (!isTouchPointerEvent(e)) return;
        pointers.delete(e.pointerId);
        if (pointers.size < 2) startDistance = 0;
    }
    document.addEventListener('pointerup', endPointer);
    document.addEventListener('pointercancel', endPointer);
}
