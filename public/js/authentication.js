(() => {
  let selectedRole = 'teacher';
  let isLoginMode = true;
  const $ = (id) => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', () => {
    $('year').textContent = new Date().getFullYear();
    $('loginForm').addEventListener('submit', (event) => { event.preventDefault(); signIn(); });
    $('registerForm').addEventListener('submit', (event) => { event.preventDefault(); signUp(); });
    document.querySelectorAll('[data-role]').forEach(button => button.addEventListener('click', () => selectRole(button.dataset.role)));
    document.querySelectorAll('[data-toggle-form]').forEach(button => button.addEventListener('click', toggleForm));
    document.querySelectorAll('[data-password]').forEach(button => button.addEventListener('click', () => togglePassword(button.dataset.password, button)));
    $('registerPassword').addEventListener('input', checkPasswordStrength);
    updateMode();
  });

  function selectRole(role) {
    if (!['teacher', 'student'].includes(role)) return;
    selectedRole = role;
    document.querySelectorAll('[data-role]').forEach(button => {
      const active = button.dataset.role === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    clearMessage();
  }

  function toggleForm() {
    isLoginMode = !isLoginMode;
    clearForms();
    clearMessage();
    updateMode();
    (isLoginMode ? $('loginEmail') : $('registerName')).focus({ preventScroll: true });
  }

  function updateMode() {
    $('loginForm').classList.toggle('hidden', !isLoginMode);
    $('registerForm').classList.toggle('hidden', isLoginMode);
    $('roleBlock').hidden = isLoginMode;
    $('modeEyebrow').textContent = isLoginMode ? 'WELCOME BACK' : 'GET STARTED';
    $('authTitle').textContent = isLoginMode ? 'Sign in to your account' : 'Create your account';
    $('authSubtitle').textContent = isLoginMode
      ? 'Enter your details to continue to QuizMaster.'
      : 'A few details and your learning workspace is ready.';
  }

  async function signIn() {
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value.trim();
    if (!validateLoginForm(email, password)) return;
    setBusy($('signInBtn'), true, 'Signing in…');
    try {
      await verificationSignIn(email, password);
    } catch (error) {
      showMessage(error.message || 'We could not sign you in. Please try again.', 'error');
    } finally {
      setBusy($('signInBtn'), false, 'Sign in');
    }
  }

  async function verificationSignIn(email, password) {
    const response = await fetch('/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.user) throw new Error(data.message || 'Email or password is incorrect.');

    const user = data.user;
    localStorage.setItem('userId', user.id);
    localStorage.setItem('role', user.role);
    localStorage.setItem('userName', user.name);
    if (user.role === 'teacher') {
      localStorage.setItem('teacherId', user.id);
      localStorage.setItem('showteacher', 'true');
      window.location.href = '/html/teacherdash.html';
    } else if (user.role === 'student') {
      localStorage.setItem('studentId', user.id);
      localStorage.setItem('showstudent', 'true');
      window.location.href = '/html/studentdash.html';
    } else {
      throw new Error('This account type cannot sign in here.');
    }
  }

  async function signUp() {
    const name = $('registerName').value.trim();
    const email = $('registerEmail').value.trim();
    const password = $('registerPassword').value;
    const confirmPassword = $('confirmPassword').value;
    if (!validateRegisterForm(name, email, password, confirmPassword)) return;
    setBusy($('signUpBtn'), true, 'Creating account…');
    try {
      const response = await fetch('/authentication/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role: selectedRole, email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'We could not create your account. Please try again.');
      isLoginMode = true;
      clearForms();
      updateMode();
      $('loginEmail').value = email;
      showMessage('Account created. Sign in with your new details.', 'success');
      $('loginPassword').focus({ preventScroll: true });
    } catch (error) {
      showMessage(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setBusy($('signUpBtn'), false, 'Create account');
    }
  }

  function validateLoginForm(email, password) {
    if (!email) return showError('Enter your email address.');
    if (!isValidEmail(email)) return showError('Enter a valid email address.');
    if (!password) return showError('Enter your password.');
    return true;
  }

  function validateRegisterForm(name, email, password, confirmPassword) {
    if (!name) return showError('Enter your full name.');
    if (!email || !isValidEmail(email)) return showError('Enter a valid email address.');
    if (!password) return showError('Create a password.');
    if (password.length < 6) return showError('Your password must have at least 6 characters.');
    if (password !== confirmPassword) return showError('The passwords do not match.');
    return true;
  }

  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

  function checkPasswordStrength() {
    const password = $('registerPassword').value;
    const container = $('passwordStrength');
    if (!password) {
      container.classList.remove('visible');
      container.replaceChildren();
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const level = strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong';
    const label = level === 'weak' ? 'Weak password' : level === 'medium' ? 'Fair password' : 'Strong password';
    container.classList.add('visible');
    container.innerHTML = `<span>${label}</span><span class="strength-track"><span class="strength-fill ${level}" style="display:block;width:${strength * 20}%"></span></span>`;
  }

  function togglePassword(inputId, button) {
    const input = $(inputId);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    button.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    input.focus({ preventScroll: true });
  }

  function showError(message) { showMessage(message, 'error'); return false; }

  function showMessage(message, type) {
    const box = document.createElement('div');
    box.className = `message ${type}`;
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info';
    const text = document.createElement('span');
    text.textContent = message;
    box.append(icon, text);
    $('messageContainer').replaceChildren(box);
  }

  function clearMessage() { $('messageContainer').replaceChildren(); }

  function clearForms() {
    ['loginEmail', 'loginPassword', 'registerName', 'registerEmail', 'registerPassword', 'confirmPassword'].forEach(id => { $(id).value = ''; });
    $('passwordStrength').classList.remove('visible');
    $('passwordStrength').replaceChildren();
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    button.innerHTML = busy
      ? `<span>${label}</span><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>`
      : `<span>${label}</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
  }
})();
