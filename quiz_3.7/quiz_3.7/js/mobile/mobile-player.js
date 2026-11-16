/* ============================================================================
 *  MODULE: js/mobile/mobile-player.js — XEM TRƯỚC & CHẠY THỬ TRÊN ĐIỆN THOẠI
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - renderMobilePreview()   : dựng màn hình xem trước / chạy thử toàn màn hình.
 *    - setupMobilePlayer()     : gắn sự kiện.
 *    - previewSingleMobileQuestion(block) : xem trước một câu hỏi đơn lẻ.
 *
 *  NGUYÊN TẮC "DÙNG CHUNG LOGIC":
 *    Màn hình này KHÔNG viết lại bộ chấm điểm, đồng hồ hay xử lý câu hỏi.
 *    Nó dùng CHUNG các hàm của Player trên PC:
 *      · startQuiz() / stopQuiz()  : chạy & dừng một ván chơi đầy đủ.
 *      · buildQuestionCard()      : dựng thẻ câu hỏi (dùng chung cả 6 loại).
 *      · showResultScreen()       : bảng tổng kết cuối ván.
 *    ⇒ Điểm số, thời gian, phản hồi đúng/sai và lời giải đều giống hệt PC.
 *
 *  PHÂN BIỆT RÕ 2 CHẾ ĐỘ:
 *    · XEM TRƯỚC : chỉ dựng giao diện, các điều khiển bị khoá (read-only).
 *    · CHẠY THỬ  : bấm "▶ Chạy thử" để chạy ván chơi thật (có điểm, có thời gian).
 * ========================================================================== */


/* ------------------------------------------------------------
 *  TRẠNG THÁI
 * ------------------------------------------------------------ */

/** Tham chiếu các phần tử của màn hình player mobile */
var MobilePlayerDOM = {
    root: null,       // vùng chứa nội dung xem trước
    header: null,     // thanh tiêu đề
    title: null,      // tên bài quiz
    counter: null,    // số thứ tự câu hỏi
    progress: null,   // thanh tiến trình
    listBtn: null,    // nút mở danh sách câu hỏi
    runBtn: null,     // nút chạy thử
    body: null        // vùng nội dung thẻ câu hỏi
};

/**
 * Dựng màn hình xem trước / chạy thử trong vùng xem trước của mobile.
 *
 * Chế độ xem trước: dựng thẻ câu hỏi đầu tiên (read-only) + nút chạy thử.
 * Chế độ chạy thử: chuyển sang Player thật (dùng chung hàm của PC).
 */
function renderMobilePreview() {
    const pane = MobileDOM.previewPane;
    if (!pane) return;

    // Nếu đang ở chế độ chạy thử thật (Player của PC) ⇒ không dựng lại
    if (DOM.playerView && DOM.playerView.style.display === 'flex') return;

    pane.innerHTML = '';

    const wrap = htmlToElement(
        '<div class="mobile-preview">'
        + '  <header class="mobile-preview-header">'
        + '    <div class="mobile-preview-info">'
        + '      <h2 class="mobile-preview-title"></h2>'
        + '      <span class="mobile-preview-counter"></span>'
        + '    </div>'
        + '    <button type="button" class="mobile-icon-btn" data-mobile-preview="list"'
        + '            title="Danh sách câu hỏi" aria-label="Danh sách câu hỏi">☰</button>'
        + '    <button type="button" class="mobile-preview-run" data-mobile-preview="run">'
        + '      ▶ Chạy thử</button>'
        + '  </header>'
        + '  <div class="mobile-preview-progress"><div class="mobile-preview-progress-fill"></div></div>'
        + '  <div class="mobile-preview-body"></div>'
        + '</div>'
    );
    pane.appendChild(wrap);

    MobilePlayerDOM.root = wrap;
    MobilePlayerDOM.header = wrap.querySelector('.mobile-preview-header');
    MobilePlayerDOM.title = wrap.querySelector('.mobile-preview-title');
    MobilePlayerDOM.counter = wrap.querySelector('.mobile-preview-counter');
    MobilePlayerDOM.progress = wrap.querySelector('.mobile-preview-progress-fill');
    MobilePlayerDOM.listBtn = wrap.querySelector('[data-mobile-preview="list"]');
    MobilePlayerDOM.runBtn = wrap.querySelector('[data-mobile-preview="run"]');
    MobilePlayerDOM.body = wrap.querySelector('.mobile-preview-body');

    // Tên bài quiz = tên dự án (dùng chung trường dữ liệu)
    MobilePlayerDOM.title.textContent = DOM.projectTitle
        ? DOM.projectTitle.value
        : 'Bài quiz';

    renderMobilePreviewCard();
}

/**
 * Dựng thẻ câu hỏi đầu tiên (chế độ xem trước, read-only).
 */
function renderMobilePreviewCard() {
    if (!MobilePlayerDOM.body) return;

    MobilePlayerDOM.body.innerHTML = '';

    if (!blocks.length) {
        MobilePlayerDOM.body.appendChild(htmlToElement(
            '<div class="mobile-empty">'
            + '  <div class="mobile-empty-icon">📝</div>'
            + '  <p>Chưa có câu hỏi nào để xem trước.</p>'
            + '</div>'));
        if (MobilePlayerDOM.counter) MobilePlayerDOM.counter.textContent = '';
        if (MobilePlayerDOM.progress) MobilePlayerDOM.progress.style.width = '0%';
        return;
    }

    const first = blocks[0];
    // Dùng CHUNG hàm dựng thẻ câu hỏi của PC
    let card = null;
    try {
        card = buildQuestionCard(first, 0);
    } catch (e) {
        console.warn('Không dựng được thẻ xem trước:', e.message);
        return;
    }

    // Khoá mọi điều khiển trong thẻ xem trước (giống bản xem trước trên PC)
    card.querySelectorAll('button, input, select, textarea').forEach(function (el) {
        el.disabled = true;
    });
    card.classList.add('is-preview-only');

    MobilePlayerDOM.body.appendChild(card);

    if (MobilePlayerDOM.counter) {
        MobilePlayerDOM.counter.textContent = 'Câu 1 / ' + blocks.length;
    }
    if (MobilePlayerDOM.progress) {
        MobilePlayerDOM.progress.style.width = (100 / blocks.length) + '%';
    }
}

/**
 * Xem trước MỘT câu hỏi cụ thể (dùng từ menu thao tác của câu hỏi).
 * @param {Object} block - khối câu hỏi cần xem trước
 */
function previewSingleMobileQuestion(block) {
    if (!block) return;

    // Chuyển sang chế độ xem trước
    setMobileMode('preview');
    renderMobilePreview();

    if (!MobilePlayerDOM.body) return;
    MobilePlayerDOM.body.innerHTML = '';

    const index = blocks.indexOf(block);
    let card = null;
    try {
        card = buildQuestionCard(block, index < 0 ? 0 : index);
    } catch (e) {
        console.warn('Không dựng được thẻ xem trước:', e.message);
        return;
    }
    card.querySelectorAll('button, input, select, textarea').forEach(function (el) {
        el.disabled = true;
    });
    card.classList.add('is-preview-only');
    MobilePlayerDOM.body.appendChild(card);

    if (MobilePlayerDOM.counter) {
        MobilePlayerDOM.counter.textContent = 'Câu ' + (index + 1) + ' / ' + blocks.length;
    }
    if (MobilePlayerDOM.progress) {
        MobilePlayerDOM.progress.style.width = (((index + 1) / blocks.length) * 100) + '%';
    }
}

/**
 * Mở Bottom Sheet danh sách câu hỏi (dùng khi xem trước hoặc khi đang chơi).
 */
function openMobileQuestionListSheet() {
    const content = htmlToElement('<div class="mobile-list-sheet"></div>');
    const list = content.querySelector('.mobile-list-sheet');

    blocks.forEach(function (block, i) {
        const meta = BLOCK_TYPES[block.type] || { icon: '❓', label: block.type };
        const color = MOBILE_TYPE_COLORS[block.type] || '#4c97ff';
        const item = htmlToElement(
            '<button type="button" class="mobile-list-item" data-block-id="' + block.id + '"'
            + ' style="--type-color:' + color + '">'
            + '  <span class="mobile-list-item-index">' + (i + 1) + '</span>'
            + '  <span class="mobile-list-item-text">'
            + '    <span class="mobile-list-item-type">' + meta.icon + ' ' + escapeHtml(meta.label) + '</span>'
            + '    <span class="mobile-list-item-title"></span>'
            + '  </span>'
            + '</button>'
        );
        const title = item.querySelector('.mobile-list-item-title');
        title.textContent = block.data.question || block.data.paragraph || 'Chưa có nội dung';
        list.appendChild(item);
    });

    if (!blocks.length) {
        list.appendChild(htmlToElement(
            '<div class="mobile-empty">Chưa có câu hỏi nào.</div>'));
    }

    openMobileSheet({ title: 'Danh sách câu hỏi', content: content });

    // Bấm vào một câu hỏi ⇒ đóng sheet (trong chế độ chơi, Player sẽ tự chuyển câu)
    list.addEventListener('click', function (e) {
        const item = e.target.closest('[data-block-id]');
        if (!item) return;
        closeMobileSheet();
    });
}

/* ------------------------------------------------------------
 *  GẮN SỰ KIỆN
 * ------------------------------------------------------------ */

/**
 * Gắn sự kiện cho màn hình xem trước / chạy thử trên mobile.
 */
function setupMobilePlayer() {
    const pane = MobileDOM.previewPane;
    if (!pane || pane.dataset.ready === '1') return;
    pane.dataset.ready = '1';

    pane.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mobile-preview]');
        if (!btn) return;
        const action = btn.dataset.mobilePreview;

        if (action === 'list') {
            openMobileQuestionListSheet();
        } else if (action === 'run') {
            // Chạy thử thật: dùng CHUNG hàm startQuiz() của PC
            if (!blocks.length) {
                showToast('⚠️ Chưa có câu hỏi nào để chạy.');
                return;
            }
            if (!window.confirm('Bắt đầu chạy thử bài quiz?')) return;
            if (typeof startQuiz === 'function') startQuiz();
        }
    });
}
