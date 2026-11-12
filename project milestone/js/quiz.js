/* Quiz creation */
(function () {
  'use strict';

  var TIME_LIMIT_SECONDS = 10 * 60;   // 10 minute quiz limit
  var POINTS_PER_QUESTION = 10;       // 10 questions x 10 points = 100
  var PASS_PERCENT = 70;              // 70% or higher passes

  /* Answer key for questions
     'text' accepted = list of lowercase accepted answers
     'radio' correct  = single correct value
     'select' correct  = same as radio
     'check' correct  = array of correct values (no wrong answers can be checked)
     'display' is the answer text shown to the user in the results. */
  var QUESTIONS = [
    { id: 'q1',  type: 'text',   accepted: ['get'], display: 'GET' },
    { id: 'q2',  type: 'text',   accepted: ['quic', 'quick udp internet connections'], display: 'QUIC' },
    { id: 'q3',  type: 'text',   accepted: ['tls', 'transport layer security'], display: 'TLS' },
    { id: 'q4',  type: 'radio',  correct: 'b', display: 'Tim Berners-Lee' },
    { id: 'q5',  type: 'radio',  correct: 'c', display: 'HTTP/2' },
    { id: 'q6',  type: 'radio',  correct: 'd', display: 'POST' },
    { id: 'q7',  type: 'radio',  correct: 'a', display: 'The private key' },
    { id: 'q8',  type: 'check',  correct: ['keepalive', 'chunked', 'pipelining'],
      display: 'Keep-alive connections, chunked transfer encoding, request pipelining' },
    { id: 'q9',  type: 'check',  correct: ['setup', 'encryption', 'ipchange'],
      display: 'Faster connection setup, built-in encryption, sessions survive an IP change' },
    { id: 'q10', type: 'select', correct: 'body', display: 'The body' }
  ];

  /* elements used */
  var form       = document.getElementById('quiz-form');
  var startPanel = document.getElementById('start-panel');
  var startBtn   = document.getElementById('start-btn');
  var resetBtn   = document.getElementById('reset-btn');
  var results    = document.getElementById('results');
  var statusBar  = document.getElementById('status-bar');
  var timerEl    = document.getElementById('timer');
  var progressEl = document.getElementById('progress');

  var timerId = null;     // setInterval handle
  var startTime = 0;      // Date.now() when the quiz started
  var submitted = false;  // guards against scoring twice

  /* timer for quiz */
  function formatTime(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Remaining time is computed from actual clock
  function tick() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    var remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
    timerEl.textContent = formatTime(remaining);
    statusBar.classList.toggle('warning', remaining <= 60);
    if (remaining === 0) { submitQuiz(true); }
  }

  function startQuiz() {
    submitted = false;
    startPanel.hidden = true;
    results.hidden = true;
    form.hidden = false;
    statusBar.hidden = false;
    startTime = Date.now();
    timerEl.textContent = formatTime(TIME_LIMIT_SECONDS);
    updateProgress();
    clearInterval(timerId);
    timerId = setInterval(tick, 500);
    document.getElementById('q1-input').focus();
  }

  /* return user answers for correct and incorrect choices*/
  function getAnswer(q) {
    if (q.type === 'text') {
      // querySelector by name: form.elements[id] would match the <fieldset id="q1"> instead
      return form.querySelector('[name="' + q.id + '"]').value.trim().toLowerCase();
    }
    if (q.type === 'select') {
      return form.querySelector('[name="' + q.id + '"]').value;
    }
    if (q.type === 'radio') {
      var checked = form.querySelector('input[name="' + q.id + '"]:checked');
      return checked ? checked.value : '';
    }
    // collect checked value from the checked boxes
    var boxes = form.querySelectorAll('input[name="' + q.id + '"]:checked');
    return Array.prototype.map.call(boxes, function (b) { return b.value; });
  }

  function isAnswered(q) {
    var a = getAnswer(q);
    return Array.isArray(a) ? a.length > 0 : a !== '';
  }

  function isCorrect(q, a) {
    if (q.type === 'text') { return q.accepted.indexOf(a) !== -1; }
    if (q.type === 'check') {
      return a.length === q.correct.length &&
             a.every(function (v) { return q.correct.indexOf(v) !== -1; });
    }
    return a === q.correct;
  }

  function updateProgress() {
    var n = QUESTIONS.filter(isAnswered).length;
    progressEl.textContent = n + ' / ' + QUESTIONS.length;
  }

  /* submitting and scoring the questions */
  function submitQuiz(timedOut) {
    if (submitted) { return; }
    submitted = true;
    clearInterval(timerId);

    var spent = Math.min(TIME_LIMIT_SECONDS, Math.round((Date.now() - startTime) / 1000));

    var total = 0;
    var rows = '';
    QUESTIONS.forEach(function (q, i) {
      var answer = getAnswer(q);
      var ok = isCorrect(q, answer);
      var points = ok ? POINTS_PER_QUESTION : 0;
      total += points;

      var card = document.getElementById(q.id);
      card.classList.remove('is-correct', 'is-incorrect');
      card.classList.add(ok ? 'is-correct' : 'is-incorrect');

      rows += '<tr class="' + (ok ? 'row-correct' : 'row-incorrect') + '">' +
        '<th scope="row">' + (i + 1) + '</th>' +
        '<td>' + points + ' / ' + POINTS_PER_QUESTION + '</td>' +
        '<td><span class="badge ' + (ok ? 'badge-ok' : 'badge-bad') + '">' +
            (ok ? 'Correct' : (isAnswered(q) ? 'Incorrect' : 'Unanswered')) + '</span></td>' +
        '<td>' + q.display + '</td></tr>';
    });

    // Lock the form so answers cannot change after submission
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.id !== 'reset-btn') { el.disabled = true; }
    });
    statusBar.hidden = true;
    var max = QUESTIONS.length * POINTS_PER_QUESTION;
    var percent = Math.round((total / max) * 100);
    var passed = percent >= PASS_PERCENT;

    results.className = 'quiz-panel ' + (passed ? 'result-pass' : 'result-fail');
    results.innerHTML =
      '<h2>' + (passed ? 'PASS' : 'FAIL') + (timedOut ? ' <small>(time expired)</small>' : '') + '</h2>' +
      '<p class="score-line">Score: <strong>' + total + ' / ' + max + '</strong> (' + percent + '%)</p>' +
      '<p>Time spent: <strong>' + formatTime(spent) + '</strong> of ' + formatTime(TIME_LIMIT_SECONDS) +
        ' &middot; Passing score: ' + PASS_PERCENT + '%</p>' +
      '<div class="table-wrap"><table class="results-table">' +
        '<caption>Question-by-question results</caption>' +
        '<thead><tr><th scope="col">Q</th><th scope="col">Score</th><th scope="col">Result</th><th scope="col">Correct answer</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
      '<button type="button" id="retake-btn" class="btn btn-primary">Retake Quiz</button>';
    results.hidden = false;
    document.getElementById('retake-btn').addEventListener('click', resetQuiz);

    results.focus();
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetQuiz() {
    clearInterval(timerId);
    submitted = false;
    form.reset();                                   // clears text, radio, checkbox, select
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = false; });
    QUESTIONS.forEach(function (q) {
      document.getElementById(q.id).classList.remove('is-correct', 'is-incorrect');
    });
    results.hidden = true;
    results.innerHTML = '';
    form.hidden = true;
    statusBar.hidden = true;
    statusBar.classList.remove('warning');
    timerEl.textContent = formatTime(TIME_LIMIT_SECONDS);
    progressEl.textContent = '0 / ' + QUESTIONS.length;
    startPanel.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    startBtn.focus();
  }

  startBtn.addEventListener('click', startQuiz);
  resetBtn.addEventListener('click', resetQuiz);
  form.addEventListener('submit', function (e) { e.preventDefault(); submitQuiz(false); });
  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);
})();