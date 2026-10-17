/***********************************************
 * Nova Calculator — محرك حساب أصلي 100%
 * الفكرة: نخزن ضغطات المستخدم كـ "رموز" (tokens)،
 * ثم نحللها بمحلل تعابير (Recursive Descent)
 * بدون استخدام eval إطلاقاً.
 ***********************************************/

/* ---------- حالة التطبيق ---------- */
let tokens = [];         // قائمة الرموز الحالية
let justEquals = false;  // هل ضُغط "=" للتو؟

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');

/* ---------- ربط الأزرار ---------- */
document.querySelectorAll('.key').forEach(function (btn) {
  btn.addEventListener('click', function () {
    handleKey(btn.dataset.key);
  });
});

/* ---------- دعم لوحة المفاتيح (على الكمبيوتر) ---------- */
document.addEventListener('keydown', function (ev) {
  const k = ev.key;
  if (/^[0-9]$/.test(k)) handleKey(k);
  else if (k === '.') handleKey('dot');
  else if (k === '+') handleKey('add');
  else if (k === '-') handleKey('sub');
  else if (k === '*') handleKey('mul');
  else if (k === '/') handleKey('div');
  else if (k === '(') handleKey('open');
  else if (k === ')') handleKey('close');
  else if (k === 'Enter' || k === '=') handleKey('equals');
  else if (k === 'Backspace') handleKey('backspace');
  else if (k === 'Escape') handleKey('clear');
});

/* ---------- توزيع الضغطات ---------- */
function handleKey(key) {
  if (key === 'clear') return clearAll();
  if (key === 'backspace') return backspace();
  if (key === 'equals') return equals();
  if (/^[0-9]$/.test(key)) return pressDigit(key);
  if (key === 'dot') return pressDot();
  if (key === 'open') return pressOpen();
  if (key === 'close') return pressClose();
  if (key === 'squared') return pressPostfix();
  if (key === 'pi' || key === 'e') return pressConst(key);
  if (key === 'sin' || key === 'cos' ||
      key === 'tan' || key === 'sqrt') return pressFunction(key);
  return pressOperator(key);
}

/* ---------- أدوات مساعدة ---------- */
function lastToken() {
  return tokens.length ? tokens[tokens.length - 1] : null;
}

/* هل ينتهي التعبير بقيمة كاملة (رقم/ثابت/قوس مغلق/تربيع)؟ */
function isValueEnd(t) {
  return t && (t.type === 'num' || t.type === 'const' ||
               t.type === 'close' || t.type === 'post');
}

/* ---------- معالجات الضغطات ---------- */
function pressDigit(d) {
  if (justEquals) { tokens = []; justEquals = false; }
  const last = lastToken();
  if (last && last.type === 'num' && last.value.length < 15) {
    last.value += d;               // نلحق الرقم بالعدد الحالي
  } else {
    tokens.push({ type: 'num', value: d });
  }
  render();
}

function pressDot() {
  if (justEquals) { tokens = []; justEquals = false; }
  const last = lastToken();
  if (last && last.type === 'num') {
    if (last.value.indexOf('.') === -1) last.value += '.';
  } else {
    tokens.push({ type: 'num', value: '0.' });
  }
  render();
}

function pressOperator(op) {
  if (justEquals) justEquals = false;   // نكمل من النتيجة
  const last = lastToken();
  if (!last) {
    if (op === '-') tokens.push({ type: 'op', value: '-' });
  } else if (last.type === 'op') {
    last.value = op;                    // استبدال العملية السابقة
  } else if (last.type === 'open' || last.type === 'fn') {
    if (op === '-') tokens.push({ type: 'op', value: '-' }); // إشارة سالبة
  } else {
    tokens.push({ type: 'op', value: op });
  }
  render();
}

function pressOpen() {
  if (justEquals) { tokens = []; justEquals = false; }
  tokens.push({ type: 'open' });
  render();
}

function pressClose() {
  const opens = tokens.filter(function (t) {
    return t.type === 'open' || t.type === 'fn';
  }).length;
  const closes = tokens.filter(function (t) {
    return t.type === 'close';
  }).length;
  if (opens > closes && isValueEnd(lastToken())) {
    tokens.push({ type: 'close' });
  }
  render();
}

function pressPostfix() {
  if (isValueEnd(lastToken())) {
    tokens.push({ type: 'post' });
  }
  render();
}

function pressConst(c) {
  if (justEquals) { tokens = []; justEquals = false; }
  tokens.push({ type: 'const', value: c });
  render();
}

function pressFunction(f) {
  if (justEquals) { tokens = []; justEquals = false; }
  tokens.push({ type: 'fn', value: f });
  render();
}

function clearAll() {
  tokens = [];
  justEquals = false;
  render();
}

function backspace() {
  justEquals = false;
  const last = lastToken();
  if (!last) return render();
  if (last.type === 'num' && last.value.length > 1) {
    last.value = last.value.slice(0, -1);   // حذف آخر رقم فقط
  } else {
    tokens.pop();                            // حذف الرمز كاملاً
  }
  render();
}

function equals() {
  const clean = sanitize(tokens);
  if (!clean.length) return;
  let value;
  try {
    value = evaluate(clean);
  } catch (err) {
    value = NaN;
  }
  expressionEl.textContent = displayTokens(clean) + ' =';
  if (!Number.isFinite(value)) {
    resultEl.textContent = 'Error';
    tokens = [];
    justEquals = false;
    return;
  }
  resultEl.textContent = formatNumber(value);
  tokens = [{ type: 'num', value: String(value) }]; // النتيجة تصبح البداية
  justEquals = true;
}

/* ---------- العرض والمعاينة الحية ---------- */
const OP_DISPLAY = { '+': ' + ', '-': ' − ', '*': ' × ', '/': ' ÷ ' };
const FN_DISPLAY = { sin: 'sin(', cos: 'cos(', tan: 'tan(', sqrt: '√(' };

function displayTokens(list) {
  let text = '';
  list.forEach(function (t) {
    if (t.type === 'num') text += t.value;
    else if (t.type === 'op') text += OP_DISPLAY[t.value];
    else if (t.type === 'open') text += '(';
    else if (t.type === 'close') text += ')';
    else if (t.type === 'const') text += (t.value === 'pi' ? 'π' : 'e');
    else if (t.type === 'fn') text += FN_DISPLAY[t.value];
    else if (t.type === 'post') text += '²';
  });
  return text;
}

function render() {
  const text = displayTokens(tokens);
  expressionEl.textContent = (text === '') ? '\u00A0' : text;
  const clean = sanitize(tokens);
  if (!clean.length) { resultEl.textContent = '0'; return; }
  try {
    resultEl.textContent = formatNumber(evaluate(clean));
  } catch (err) {
    resultEl.textContent = 'Error';
  }
}

/* تنظيف الرموز: حذف النواقص وإغلاق الأقواس تلقائياً */
function sanitize(list) {
  const out = list.slice();
  while (out.length) {
    const t = out[out.length - 1];
    if (t.type === 'op' || t.type === 'open' || t.type === 'fn') out.pop();
    else break;
  }
  let opens = 0;
  out.forEach(function (t) {
    if (t.type === 'open' || t.type === 'fn') opens++;
    else if (t.type === 'close') opens--;
  });
  while (opens > 0) { out.push({ type: 'close' }); opens--; }
  return out;
}

/* ---------- المحلل (Parser): قلب المشروع ---------- */
function evaluate(list) {
  let pos = 0;

  function peek() { return list[pos] || null; }
  function take() { return list[pos++]; }

  /* جمع وطرح */
  function parseExpression() {
    let value = parseTerm();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
        take();
        const right = parseTerm();
        value = (t.value === '+') ? value + right : value - right;
      } else break;
    }
    return value;
  }

  /* ضرب وقسم + الضرب الضمني مثل 2π أو 3(4+1) */
  function parseTerm() {
    let value = parseUnary();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
        take();
        const right = parseUnary();
        value = (t.value === '*') ? value * right : value / right;
      } else if (t && (t.type === 'num' || t.type === 'const' ||
                       t.type === 'open' || t.type === 'fn')) {
        value = value * parseUnary();
      } else break;
    }
    return value;
  }

  /* الإشارة السالبة الأحادية مثل -5 */
  function parseUnary() {
    const t = peek();
    if (t && t.type === 'op' && t.value === '-') { take(); return -parseUnary(); }
    if (t && t.type === 'op' && t.value === '+') { take(); return parseUnary(); }
    return parsePostfix();
  }

  /* التربيع اللاحق مثل 5² */
  function parsePostfix() {
    let value = parseFactor();
    while (peek() && peek().type === 'post') { take(); value = value * value; }
    return value;
  }

  /* العوامل: رقم، ثابت، قوس، أو دالة */
  function parseFactor() {
    const t = take();
    if (!t) throw new Error('incomplete');
    if (t.type === 'num') return parseFloat(t.value);
    if (t.type === 'const') return (t.value === 'pi') ? Math.PI : Math.E;
    if (t.type === 'open') {
      const value = parseExpression();
      expectClose();
      return value;
    }
    if (t.type === 'fn') {
      const value = parseExpression();
      expectClose();
      return applyFunction(t.value, value);
    }
    throw new Error('unexpected token');
  }

  function expectClose() {
    const t = peek();
    if (t && t.type === 'close') { take(); return; }
    throw new Error('missing close');
  }

  const result = parseExpression();
  if (pos < list.length) throw new Error('leftover input');
  return result;
}

/* الدوال العلمية — المثلثية بالدرجات */
function applyFunction(name, x) {
  const rad = x * Math.PI / 180;
  if (name === 'sin') return Math.sin(rad);
  if (name === 'cos') return Math.cos(rad);
  if (name === 'tan') {
    const m = ((x % 180) + 180) % 180;
    if (Math.abs(m - 90) < 1e-9) throw new Error('undefined tan');
    return Math.tan(rad);
  }
  if (name === 'sqrt') {
    if (x < 0) throw new Error('negative sqrt');
    return Math.sqrt(x);
  }
  throw new Error('unknown function');
}

/* ---------- تنسيق الأرقام ---------- */
function formatNumber(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'Error';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
    const parts = n.toExponential(8).split('e');
    return trimZeros(parts[0]) + '×10^' + parseInt(parts[1], 10);
  }
  return trimZeros(parseFloat(n.toPrecision(12)).toString());
}

function trimZeros(text) {
  if (text.indexOf('.') === -1) return text;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

/* ---------- بدء التشغيل ---------- */
render();
