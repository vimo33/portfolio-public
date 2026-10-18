'use strict';
(() => {
  const form = document.querySelector('#inquiry-form');
  if (!form) return;
  const recipient = 'vikasm.22@gmail.com';
  const fields = {
    name: form.querySelector('#inquiry-name'),
    email: form.querySelector('#inquiry-email'),
    details: form.querySelector('#inquiry-details'),
    timing: form.querySelector('#inquiry-timing'),
    budget: form.querySelector('#inquiry-budget')
  };
  const status = document.querySelector('#inquiry-status');
  const draft = document.querySelector('#inquiry-draft');
  const preview = document.querySelector('#inquiry-copy-text');
  const subjectDisplay = document.querySelector('#inquiry-subject');
  const openEmail = document.querySelector('#inquiry-open-email');
  const copyButton = document.querySelector('#inquiry-copy');
  const copyStatus = document.querySelector('#inquiry-copy-status');
  const draftNote = document.querySelector('#inquiry-draft-note');
  const inquiryTypes = new Set(['Build a tool','Explore an idea','Collaborate','Something else']);
  let currentDraft = null;
  const singleLine = value => value.replace(/[\r\n]+/g,' ').trim();

  function setError(key, message) {
    const field = fields[key];
    const error = document.querySelector(`#inquiry-${key}-error`);
    field.setAttribute('aria-invalid',String(Boolean(message)));
    error.textContent = message;
    error.hidden = !message;
  }
  function invalidateDraft() {
    if (currentDraft) {
      currentDraft = null;
      draft.hidden = true;
      preview.value = '';
      subjectDisplay.textContent = '';
      openEmail.href = `mailto:${recipient}`;
      status.textContent = 'Your details changed. Prepare the email again to update the draft.';
      status.classList.remove('is-error');
    }
  }
  function validate() {
    const errors = [];
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const details = fields.details.value.trim();
    const checks = {
      name: name ? '' : 'Please add your name.',
      email: !email ? 'Please add your email address.' : !fields.email.validity.valid || /[\r\n]/.test(email) ? 'Please enter a valid email address.' : '',
      details: details ? '' : 'Tell me a little about your idea or inquiry.'
    };
    for (const [key,message] of Object.entries(checks)) {
      setError(key,message);
      if (message) errors.push(fields[key]);
    }
    if (errors.length) {
      status.textContent = 'Check the highlighted fields, then prepare your email.';
      status.classList.add('is-error');
      errors[0].focus();
      return false;
    }
    status.classList.remove('is-error');
    return true;
  }

  form.addEventListener('submit',event => {
    event.preventDefault();
    if (!validate()) return;
    const name = singleLine(fields.name.value);
    const email = singleLine(fields.email.value);
    const selectedType = form.querySelector('[name="inquiry-type"]:checked')?.value;
    const type = inquiryTypes.has(selectedType) ? selectedType : 'Something else';
    const timing = singleLine(fields.timing.value);
    const budget = singleLine(fields.budget.value);
    const details = fields.details.value.replace(/\r\n?/g,'\n').trim();
    const subject = `${type} - ${name}`;
    const body = [
      'Hi Vikas,',
      '',
      details,
      '',
      `Inquiry: ${type}`,
      ...(timing ? [`Timing: ${timing}`] : []),
      ...(budget ? [`Budget: ${budget}`] : []),
      '',
      `From: ${name}`,
      `Reply to: ${email}`
    ].join('\n');
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const longNote = mailto.length > 1900;
    currentDraft = {subject,body};
    subjectDisplay.textContent = subject;
    preview.value = body;
    openEmail.href = longNote ? `mailto:${recipient}?subject=${encodeURIComponent(subject)}` : mailto;
    draftNote.textContent = longNote
      ? 'This is a longer note. Copy the inquiry below, then open your email app and paste it. The email link includes the subject only, so your message won’t be cut short.'
      : 'Open your email app to review and send it. If that doesn’t work, copy the inquiry into an email.';
    copyStatus.textContent = '';
    status.textContent = 'Your draft is ready to review below. Nothing has been sent.';
    draft.hidden = false;
    document.querySelector('#inquiry-draft-title').focus();
  });

  form.addEventListener('input',event => {
    const key = Object.keys(fields).find(key => fields[key] === event.target);
    if (key && ['name','email','details'].includes(key) && fields[key].getAttribute('aria-invalid') === 'true') setError(key,'');
    invalidateDraft();
  });
  form.addEventListener('change',invalidateDraft);
  openEmail.addEventListener('click',() => {
    copyStatus.textContent = 'Your email app may open with the draft. You choose when to send it. If it doesn’t open, use Copy inquiry.';
  });
  copyButton.addEventListener('click',async () => {
    if (!currentDraft) return;
    const text = `To: ${recipient}\nSubject: ${currentDraft.subject}\n\n${currentDraft.body}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = 'Inquiry copied. Paste it into your email when you’re ready. Nothing has been sent.';
    } catch {
      preview.focus();
      preview.select();
      preview.setSelectionRange(0,preview.value.length);
      copyStatus.textContent = 'Automatic copying isn’t available. Your message is selected: use your browser’s Copy command, then paste it into an email. The recipient and subject are shown above.';
    }
  });
  // Register interception before enabling the button; no native form request is made.
  document.querySelector('#inquiry-prepare').disabled = false;
})();
