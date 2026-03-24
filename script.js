const appState = {
  stepIndex: 0,
  isTyping: false,
  docsChecked: 0,
  dossier: {
    roleDeclarant: '',
    defunt: { nom: '', dateDeces: '', commune: '', situation: '' },
    heritiers: [],
    patrimoine: { immobilier: '', comptes: '' },
    passif: '',
    notes: []
  },
  piecesList: [
    { name: 'Acte de décès', status: 'miss' },
    { name: 'Livret de famille', status: 'miss' },
    { name: "Pièce d'identité héritiers", status: 'miss' },
    { name: 'Titre de propriété immobilier', status: 'miss' },
    { name: 'Relevés bancaires (3 mois)', status: 'miss' },
    { name: 'Contrats assurance-vie', status: 'miss' },
    { name: "Avis d'imposition (N-1)", status: 'miss' },
    { name: 'Contrat de mariage / PACS', status: 'miss' },
    { name: 'Testament (si existant)', status: 'miss' },
    { name: 'Certificat de propriété véhicule', status: 'miss' },
    { name: 'Relevés épargne', status: 'miss' },
    { name: 'Liste dettes et crédits', status: 'miss' }
  ]
};

const area = document.getElementById('chat-area');
const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
}

function addMsg(type, content, isHTML = false) {
  const box = document.createElement('div');
  box.className = `msg ${type}`;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${type === 'agent' ? 'agent-av' : 'user-av'}`;
  avatar.textContent = type === 'agent' ? '⚖' : 'ML';

  const body = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (isHTML) bubble.innerHTML = content;
  else bubble.textContent = content;
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = now();

  body.append(bubble, time);
  box.append(avatar, body);
  area.appendChild(box);
  area.scrollTop = area.scrollHeight;
  return bubble;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.id = 'typing';
  wrap.className = 'msg agent';
  wrap.innerHTML = '<div class="msg-avatar agent-av">⚖</div><div class="typing-bubble"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>';
  area.appendChild(wrap);
  area.scrollTop = area.scrollHeight;
}

function removeTyping() {
  document.getElementById('typing')?.remove();
}

function removeChoices() {
  document.getElementById('choices')?.remove();
}

function showChoices(choices) {
  removeChoices();
  const panel = document.createElement('div');
  panel.className = 'choices';
  panel.id = 'choices';
  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = `${choice.icon || '→'} ${choice.label}`;
    btn.addEventListener('click', () => {
      addMsg('user', choice.label);
      processStep(choice.value);
      removeChoices();
    });
    panel.appendChild(btn);
  });
  area.appendChild(panel);
}

async function agentSay(text, delay = 700, isHTML = false) {
  await wait(delay * 0.3);
  showTyping();
  await wait(delay);
  removeTyping();
  return addMsg('agent', text, isHTML);
}

function updateProgress(pct, label, stageIdx) {
  document.getElementById('prog-fill').style.width = `${pct}%`;
  document.getElementById('prog-pct').textContent = `${pct}%`;
  document.getElementById('prog-label').textContent = label;
  document.getElementById('nb-complete-fill').style.width = `${pct}%`;
  document.getElementById('nb-complete-pct').textContent = `${pct}%`;

  document.querySelectorAll('.stage-pill').forEach((pill, i) => {
    pill.className = 'stage-pill';
    if (i < stageIdx) pill.classList.add('done');
    else if (i === stageIdx) pill.classList.add('active');
  });
}

function updateDossierHeader(name, ref) {
  document.getElementById('nb-nom').textContent = name;
  document.getElementById('nb-ref').textContent = ref;
}

function addHeritier(initiales, nom, role, statut, color = '#2d5a8e') {
  const list = document.getElementById('heritiers-list');
  list.querySelector('.placeholder')?.remove();
  const row = document.createElement('div');
  row.className = 'heritier-item';
  row.innerHTML = `<span class="h-avatar" style="background:${color}20;color:${color}">${initiales}</span>
    <span style="flex:1"><span class="h-name">${nom}</span><br /><span class="h-role">${role}</span></span>
    <span class="h-badge" style="background:${color}20;color:${color}">${statut}</span>`;
  list.appendChild(row);
}

function updatePieces() {
  const grid = document.getElementById('pieces-grid');
  grid.innerHTML = '';
  let okCount = 0;

  appState.piecesList.forEach((piece) => {
    if (piece.status === 'ok') okCount += 1;
    const row = document.createElement('div');
    row.className = 'piece-row';

    const tag = piece.status === 'ok'
      ? { text: 'Reçue', bg: 'var(--green-light)', color: 'var(--green)', icon: '✓' }
      : piece.status === 'warn'
      ? { text: 'À vérifier', bg: 'var(--amber-light)', color: 'var(--amber)', icon: '⚠' }
      : { text: 'Manquante', bg: 'var(--bg4)', color: 'var(--text3)', icon: '○' };

    row.innerHTML = `<span>${tag.icon}</span><span style="flex:1">${piece.name}</span><span class="piece-tag" style="background:${tag.bg};color:${tag.color}">${tag.text}</span>`;
    grid.appendChild(row);
  });

  document.getElementById('nb-pieces').textContent = `${okCount}/${appState.piecesList.length}`;
}

function addAlerte(text, type = 'info') {
  const list = document.getElementById('alertes-list');
  const box = document.createElement('div');
  box.className = `alert-box ${type}`;
  const icon = type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  box.innerHTML = `<span>${icon}</span><p>${text}</p>`;
  list.appendChild(box);
}

function renderDocWidget() {
  const tpl = document.getElementById('doc-check-template');
  const bubble = addMsg('agent', '', true);
  bubble.innerHTML = '<p>Documents prioritaires à transmettre :</p>';
  bubble.appendChild(tpl.content.cloneNode(true));

  bubble.querySelectorAll('.doc-item').forEach((btn) => {
    btn.addEventListener('click', () => markDoc(Number(btn.dataset.doc), btn));
  });

  bubble.querySelector('#upload-zone')?.addEventListener('click', simulateUpload);
}

function refreshDocCounter(contextEl = document) {
  const el = contextEl.querySelector('#doc-counter');
  if (el) el.textContent = `${appState.docsChecked} / 5 reçus`;
}

function markDoc(index, btnEl) {
  if (index > 4) return;
  const btn = btnEl || area.querySelector(`.doc-item[data-doc="${index}"]`);
  if (!btn || btn.dataset.done === '1') return;

  btn.dataset.done = '1';
  const status = btn.querySelector('.doc-status');
  status.className = 'doc-status doc-ok';
  status.textContent = '✓';

  appState.docsChecked += 1;
  appState.piecesList[index].status = 'ok';
  if (index === 4) appState.piecesList[10].status = 'ok';
  if (index === 3) appState.piecesList[6].status = 'ok';
  updatePieces();

  refreshDocCounter(btn.closest('.msg-bubble'));
  if (appState.docsChecked === 5) {
    agentSay('Parfait, les 5 pièces prioritaires sont bien marquées comme reçues.').then(() => {
      processStep('__docs_completed__');
    });
  }
}

function simulateUpload() {
  const names = ['Acte_deces', 'Livret_famille', 'Identites', 'Avis_imposition', 'Releves_bancaires'];
  const next = appState.docsChecked;
  if (next >= names.length) return;
  addMsg('user', `📎 ${names[next]}.pdf envoyé (simulation)`);
  markDoc(next);
}

function download(filename, data, mime = 'application/json') {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function createSummaryText() {
  const d = appState.dossier;
  return [
    'NOTE DE SYNTHÈSE — Dossier succession (démo)',
    `Déclarant: ${d.roleDeclarant || 'Non précisé'}`,
    `Défunt: ${d.defunt.nom || 'Non renseigné'}`,
    `Date de décès: ${d.defunt.dateDeces || 'Non renseignée'}`,
    `Commune: ${d.defunt.commune || 'Non renseignée'}`,
    `Situation familiale: ${d.defunt.situation || 'Non renseignée'}`,
    `Patrimoine immobilier: ${d.patrimoine.immobilier || 'Non renseigné'}`,
    `Comptes / épargne: ${d.patrimoine.comptes || 'Non renseignés'}`,
    `Passif connu: ${d.passif || 'Non renseigné'}`,
    `Observations héritier: ${d.notes.join(' | ') || 'Aucune'}`
  ].join('\n');
}

function setupTopViewToggle() {
  const app = document.getElementById('app');
  const hv = document.getElementById('heritier-view');
  const nv = document.getElementById('notaire-view');
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;

      if (view === 'both') {
        app.className = 'app dual';
        hv.style.display = 'flex';
        nv.style.display = 'flex';
      } else if (view === 'chat') {
        app.className = 'app';
        hv.style.display = 'flex';
        nv.style.display = 'none';
      } else {
        app.className = 'app';
        hv.style.display = 'none';
        nv.style.display = 'flex';
      }
    });
  });
}

function setupActionButtons() {
  document.getElementById('btn-generate-note').addEventListener('click', () => {
    const note = createSummaryText();
    download('note-synthese-succession-demo.txt', note, 'text/plain;charset=utf-8');
    addAlerte('Note de synthèse générée et téléchargée.', 'ok');
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      dossier: appState.dossier,
      pieces: appState.piecesList
    }, null, 2);
    download('dossier-succession-demo.json', payload);
    addAlerte('Export JSON du dossier généré.', 'ok');
  });

  document.getElementById('btn-reset-demo').addEventListener('click', () => {
    window.location.reload();
  });
}

const flow = [
  async () => {
    await agentSay("Bonjour. Je suis l'assistant successions de l'étude. Je vous accompagne pas à pas.", 800);
    await agentSay('Quel est votre lien avec le défunt ?', 700);
    showChoices([
      { icon: '👧', label: 'Enfant du défunt', value: 'enfant' },
      { icon: '💍', label: 'Conjoint survivant', value: 'conjoint' },
      { icon: '👤', label: 'Autre héritier / légataire', value: 'autre' }
    ]);
  },
  async (value) => {
    appState.dossier.roleDeclarant = value;
    updateProgress(16, 'Étape 1 sur 6 — Identification du défunt', 0);
    await agentSay('Merci. Pouvez-vous indiquer le nom complet du défunt ?', 700);
  },
  async (value) => {
    appState.dossier.defunt.nom = value;
    updateDossierHeader(`Succession ${value}`, `Réf. SUC-2026-${Math.floor(1000 + Math.random() * 8999)}`);
    addHeritier('ML', 'Marie Lambert', 'Déclarante', 'En ligne');
    updateProgress(24, 'Étape 1 sur 6 — Identification du défunt', 0);
    await agentSay('Merci. Quelle est la date du décès ?', 700);
  },
  async (value) => {
    appState.dossier.defunt.dateDeces = value;
    updateProgress(30, 'Étape 1 sur 6 — Identification du défunt', 0);
    await agentSay('Et sa commune de résidence principale au moment du décès ?', 700);
  },
  async (value) => {
    appState.dossier.defunt.commune = value;
    updateProgress(38, 'Étape 2 sur 6 — Situation familiale & héritiers', 1);
    await agentSay('Quelle était sa situation matrimoniale ?', 600);
    showChoices([
      { icon: '💍', label: 'Marié(e)', value: 'marié(e)' },
      { icon: '📄', label: 'Pacsé(e)', value: 'pacsé(e)' },
      { icon: '👤', label: 'Célibataire / Divorcé(e)', value: 'célibataire' },
      { icon: '🕊️', label: 'Veuf / Veuve', value: 'veuf/veuve' }
    ]);
  },
  async (value) => {
    appState.dossier.defunt.situation = value;
    if (value.includes('Marié') || value.includes('Pacsé')) appState.piecesList[7].status = 'warn';
    updatePieces();
    updateProgress(46, 'Étape 2 sur 6 — Situation familiale & héritiers', 1);
    await agentSay('Combien d’enfants sont concernés par la succession ?', 700);
    showChoices([
      { icon: '1️⃣', label: '1 enfant', value: 1 },
      { icon: '2️⃣', label: '2 enfants', value: 2 },
      { icon: '3️⃣', label: '3 enfants ou plus', value: 3 },
      { icon: '✖️', label: 'Aucun enfant', value: 0 }
    ]);
  },
  async (value) => {
    document.getElementById('nb-heritiers').textContent = String(value + 1);
    if (value > 0) addHeritier('H+', 'Autres héritiers', `${value} enfant(s)`, 'À compléter', '#2d6a4f');
    updateProgress(55, 'Étape 3 sur 6 — Patrimoine', 2);
    await agentSay('Y a-t-il un bien immobilier dans la succession ?', 700);
    showChoices([
      { icon: '🏠', label: 'Oui, un bien principal', value: '1 bien' },
      { icon: '🏘️', label: 'Oui, plusieurs biens', value: 'plusieurs biens' },
      { icon: '✖️', label: 'Non', value: 'aucun bien' }
    ]);
  },
  async (value) => {
    appState.dossier.patrimoine.immobilier = value;
    if (value !== 'aucun bien') {
      appState.piecesList[3].status = 'warn';
      document.getElementById('nb-patrimoine').textContent = 'À expertiser';
      addAlerte('Biens immobiliers identifiés : expertise et état hypothécaire recommandés.', 'warn');
    }
    updatePieces();
    updateProgress(64, 'Étape 3 sur 6 — Patrimoine', 2);
    await agentSay('Connaissez-vous les comptes bancaires / contrats épargne du défunt ?', 700);
    showChoices([
      { icon: '🏦', label: 'Oui, j’ai les relevés', value: 'détails disponibles' },
      { icon: '❓', label: 'Oui, sans détails', value: 'incomplet' },
      { icon: '🧾', label: 'Non / je ne sais pas', value: 'inconnu' }
    ]);
  },
  async (value) => {
    appState.dossier.patrimoine.comptes = value;
    if (value === 'détails disponibles') {
      appState.piecesList[4].status = 'warn';
      appState.piecesList[10].status = 'warn';
    } else {
      addAlerte('Recherche FICOBA/FICOVIE conseillée pour compléter les actifs.', 'info');
    }
    updatePieces();
    updateProgress(74, 'Étape 4 sur 6 — Documents', 3);
    await agentSay('Très bien. Nous passons aux pièces justificatives prioritaires.', 700);
    renderDocWidget();
  },
  async (value) => {
    if (value !== '__docs_completed__') return;
    updateProgress(84, 'Étape 5 sur 6 — Passif', 4);
    await agentSay('Connaissez-vous des dettes, crédits ou impayés en cours ?', 700);
    showChoices([
      { icon: '💳', label: 'Oui, crédit immobilier', value: 'crédit immobilier' },
      { icon: '💸', label: 'Oui, autres dettes', value: 'autres dettes' },
      { icon: '✅', label: 'Non', value: 'aucune dette connue' },
      { icon: '❓', label: 'Je ne sais pas', value: 'inconnu' }
    ]);
  },
  async (value) => {
    appState.dossier.passif = value;
    if (value !== 'aucune dette connue') appState.piecesList[11].status = 'warn';
    updatePieces();
    updateProgress(96, 'Étape 6 sur 6 — Validation', 5);
    document.getElementById('nb-status').textContent = '🟢 Prêt pour revue notariale';
    addAlerte('Dossier prêt pour lecture et prise de rendez-vous notarial.', 'ok');
    await agentSay('Merci, le parcours essentiel est complété. Voulez-vous ajouter une précision (testament, donation, conflit) ?', 800);
  }
];

async function processStep(value) {
  if (appState.isTyping) return;
  if (appState.stepIndex >= flow.length) {
    appState.dossier.notes.push(value || 'Note vide');
    await agentSay('Merci, votre précision a été ajoutée au dossier pour le notaire.', 500);
    return;
  }

  appState.isTyping = true;
  await flow[appState.stepIndex](value);
  appState.stepIndex += 1;
  appState.isTyping = false;
}

function handleUserInput() {
  const value = input.value.trim();
  if (!value || appState.isTyping) return;
  addMsg('user', value);
  input.value = '';
  autoResize(input);
  removeChoices();
  processStep(value);
}

function setupInput() {
  input.addEventListener('input', () => autoResize(input));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleUserInput();
    }
  });
  sendBtn.addEventListener('click', handleUserInput);
}

function bootstrap() {
  setupTopViewToggle();
  setupActionButtons();
  setupInput();
  updatePieces();
  processStep();
}

bootstrap();
