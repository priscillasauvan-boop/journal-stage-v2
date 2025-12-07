// État de l'application
let currentTab = 'stages';
let selectedMood = null;
let stages = [];
let notes = [];
let evaluations = [];
let evaluationsTuteur = [];

// Charger les données depuis l'API
async function loadStages() {
  try {
    const response = await fetch('/api/stages');
    const data = await response.json();
    
    const MODALITY_NAMES = {
      nucleaire: 'Médecine Nucléaire',
      radiotherapie: 'Radiothérapie',
      scanner: 'Scanner',
      irm: 'IRM',
      conventionnelle: 'Conventionnelle',
      interventionnelle: 'Interventionnelle',
      echographie: 'Échographie'
    };
    
    stages = data.map(stage => ({
      id: stage.id,
      name: stage.name || stage.lieu,
      modality: stage.modality,
      modalityName: MODALITY_NAMES[stage.modality],
      emoji: stage.emoji,
      lieu: stage.lieu,
      tuteur: stage.tuteur,
      cadre: stage.cadre,
      dateDebut: stage.date_debut,
      dateFin: stage.date_fin,
      joursTravailles: stage.jours_travailles
    }));
  } catch (error) {
    console.error('Erreur chargement stages:', error);
    stages = [];
  }
}

async function loadNotes() {
  try {
    const response = await fetch('/api/notes');
    const data = await response.json();
    notes = data.map(note => ({
      ...note,
      stageId: note.stage_id
    }));
  } catch (error) {
    console.error('Erreur chargement notes:', error);
    notes = [];
  }
}

async function loadEvaluations() {
  try {
    const response = await fetch('/api/evaluations');
    const data = await response.json();
    evaluations = data.map(ev => ({
      ...ev,
      stageId: ev.stage_id,
      scores: {
        ponctualite: ev.ponctualite,
        communication: ev.communication,
        esprit: ev.esprit,
        confiance: ev.confiance,
        adaptabilite: ev.adaptabilite,
        protocoles: ev.protocoles,
        gestes: ev.gestes,
        materiel: ev.materiel,
        organisation: ev.organisation,
        patient: ev.patient
      },
      totalScore: ev.total_score
    }));
  } catch (error) {
    console.error('Erreur chargement evaluations:', error);
    evaluations = [];
  }
}

// Emojis pour les humeurs
const MOOD_EMOJIS = {
  excellent: '😊',
  bien: '🙂',
  moyen: '😐',
  difficile: '😕',
  penible: '😞'
};

const MOOD_LABELS = {
  excellent: 'Excellent',
  bien: 'Bien',
  moyen: 'Moyen',
  difficile: 'Difficile',
  penible: 'Pénible'
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initMoodSelector();
  initDateDisplay();
  
  await loadStages();
  await loadNotes();
  await loadEvaluations();
  await loadEvaluationsTuteur();
  
  initStageSelector();
  initModalityFilter();
  initEvaluationForm();
  initEvalTuteurStagiaireForm();
  initTuteurGrid();
  renderStages();
  renderNotes();
  renderStats();

  // Bouton sauvegarder
  document.getElementById('save-note').addEventListener('click', saveNote);
  document.getElementById('save-evaluation').addEventListener('click', saveEvaluation);
  document.getElementById('save-eval-tuteur-stagiaire').addEventListener('click', saveEvalTuteurStagiaire);
});

// Gestion des onglets
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Mise à jour des onglets
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Mise à jour des vues
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`${tabName}-view`).classList.add('active');

  currentTab = tabName;

  // Rafraîchir les données si nécessaire
  if (tabName === 'stages') renderStages();
  if (tabName === 'journal') renderNotes();
  if (tabName === 'tuteur') renderEvalTuteurHistory();
  if (tabName === 'stats') renderStats();
}

// Sélecteur d'humeur
function initMoodSelector() {
  const moodButtons = document.querySelectorAll('.mood-btn');
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Retirer la sélection des autres
      moodButtons.forEach(b => b.classList.remove('selected'));
      
      // Sélectionner celui-ci
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    });
  });
}

// Affichage de la date
function initDateDisplay() {
  const dateInput = document.getElementById('selected-date');
  const dateDisplayText = document.getElementById('date-display-text');
  const today = new Date();
  
  // Initialiser avec la date du jour
  const todayString = today.toISOString().split('T')[0];
  dateInput.value = todayString;
  
  // Afficher la date en français
  updateDateDisplay(today);
  
  // Détecter le stage automatiquement
  detectStageForDate(todayString);
  
  // Écouter les changements de date
  dateInput.addEventListener('change', () => {
    const selectedDate = new Date(dateInput.value + 'T00:00:00');
    updateDateDisplay(selectedDate);
    detectStageForDate(dateInput.value);
  });
}

// Mettre à jour l'affichage de la date en français
function updateDateDisplay(date) {
  const dateDisplayText = document.getElementById('date-display-text');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateDisplayText.textContent = date.toLocaleDateString('fr-FR', options);
}

// Détecter automatiquement le stage correspondant à une date
function detectStageForDate(dateString) {
  const autoDetectDiv = document.getElementById('stage-auto-detect');
  const stageSelect = document.getElementById('stage-select');
  
  if (!dateString) {
    autoDetectDiv.style.display = 'none';
    return;
  }
  
  // Trouver le stage qui correspond à cette date
  const matchingStage = stages.find(stage => {
    return dateString >= stage.dateDebut && dateString <= stage.dateFin;
  });
  
  if (matchingStage) {
    // Afficher le message de détection automatique
    autoDetectDiv.innerHTML = `
      <span class="stage-emoji">${matchingStage.emoji}</span>
      Stage détecté : <strong>${matchingStage.name}</strong>
      <br>
      <span style="font-size: 0.85rem; font-weight: normal;">
        Du ${formatDate(matchingStage.dateDebut)} au ${formatDate(matchingStage.dateFin)}
      </span>
    `;
    autoDetectDiv.style.display = 'block';
    
    // Pré-sélectionner le stage dans le menu déroulant
    stageSelect.value = matchingStage.id;
  } else {
    // Aucun stage trouvé pour cette date
    autoDetectDiv.innerHTML = `
      ⚠️ Aucun stage trouvé pour cette date
      <br>
      <span style="font-size: 0.85rem; font-weight: normal;">
        Choisis un stage manuellement ou crée-en un nouveau
      </span>
    `;
    autoDetectDiv.style.display = 'block';
    
    // Réinitialiser la sélection
    stageSelect.value = '';
  }
}

// Sélecteur de stage
function initStageSelector() {
  const select = document.getElementById('stage-select');
  
  if (stages.length === 0) {
    select.innerHTML = '<option value="">Aucun stage - Crée-en un d\'abord !</option>';
  } else {
    select.innerHTML = '<option value="">Sélectionne un stage</option>';
    
    stages.forEach(stage => {
      const option = document.createElement('option');
      option.value = stage.id;
      option.textContent = `${stage.emoji} ${stage.name}`;
      select.appendChild(option);
    });
  }
}

// Filtre par modalité
function initModalityFilter() {
  const select = document.getElementById('modality-select');
  select.addEventListener('change', renderStages);
}

// Rendu des stages
function renderStages() {
  const container = document.getElementById('stages-list');
  const filter = document.getElementById('modality-select').value;
  
  const filteredStages = filter 
    ? stages.filter(s => s.modality === filter)
    : stages;

  if (filteredStages.length === 0) {
    if (stages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div class="empty-state-text">Enregistre d'abord ton premier stage</div>
          <div class="empty-state-hint">Clique sur "➕ Nouveau Stage" pour commencer</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">Aucun stage trouvé</div>
          <div class="empty-state-hint">Essaie de changer de filtre</div>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = filteredStages.map(stage => `
    <div class="stage-card">
      <div class="stage-card-header">
        <span class="stage-emoji">${stage.emoji}</span>
        <div style="flex: 1;">
          <div class="stage-name">${stage.name}</div>
          <div class="stage-modality">${stage.modalityName}</div>
        </div>
      </div>
      <div class="stage-dates">
        <div>📅 ${formatDate(stage.dateDebut)} → ${formatDate(stage.dateFin)}</div>
        <div>👨‍⚕️ ${stage.tuteur}</div>
        <div>👔 ${stage.cadre}</div>
      </div>
      <div class="stage-actions">
        <button class="btn-edit" onclick="editStage(${stage.id})">✏️ Modifier</button>
        <button class="btn-delete-stage" onclick="deleteStage(${stage.id})">🗑️ Supprimer</button>
      </div>
    </div>
  `).join('');
}

// Sauvegarder une note
async function saveNote() {
  const stageId = document.getElementById('stage-select').value;
  const content = document.getElementById('note-content').value.trim();
  const selectedDate = document.getElementById('selected-date').value;

  if (!selectedMood) {
    showToast('Choisis une humeur d\'abord ! 😊');
    return;
  }

  if (!stageId) {
    showToast('Sélectionne un stage ! 📚');
    return;
  }

  if (!content) {
    showToast('Écris quelque chose dans la note ! ✏️');
    return;
  }

  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: parseInt(stageId),
        date: selectedDate,
        mood: selectedMood,
        note: content
      })
    });

    if (!response.ok) throw new Error('Erreur sauvegarde note');

    // Recharger les notes
    await loadNotes();

    // Réinitialiser le formulaire
    document.getElementById('note-content').value = '';
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    selectedMood = null;

    // Rafraîchir l'affichage
    renderNotes();
    renderStats();

    showToast('Note enregistrée ! 💾');
  } catch (error) {
    console.error('Erreur sauvegarde note:', error);
    showToast('Erreur lors de la sauvegarde ❌');
  }
}

// Rendu des notes (groupées par stage)
function renderNotes() {
  const container = document.getElementById('notes-list');
  
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">Aucune note pour le moment</div>
        <div class="empty-state-hint">Commence ton journal en haut !</div>
      </div>
    `;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Grouper les notes par stage
  const notesByStage = {};
  notes.forEach(note => {
    if (!notesByStage[note.stageId]) {
      notesByStage[note.stageId] = [];
    }
    notesByStage[note.stageId].push(note);
  });

  let html = '';

  // Pour chaque stage ayant des notes
  Object.keys(notesByStage).forEach(stageId => {
    const stage = stages.find(s => s.id === parseInt(stageId));
    if (!stage) return;

    const stageNotes = notesByStage[stageId];
    const isFinished = stage.dateFin < today;

    if (isFinished) {
      // Stage terminé : version compacte/collapsible
      html += `
        <div class="stage-notes-group finished">
          <div class="stage-notes-header" onclick="toggleStageNotes(${stageId})">
            <div class="stage-notes-title">
              <span class="stage-emoji">${stage.emoji}</span>
              <span class="stage-name-compact">${stage.name}</span>
              <span class="notes-count">${stageNotes.length} note${stageNotes.length > 1 ? 's' : ''}</span>
            </div>
            <span class="toggle-icon" id="toggle-${stageId}">▼</span>
          </div>
          <div class="stage-notes-content" id="notes-${stageId}" style="display: none;">
            ${stageNotes.map(note => `
              <div class="note-card-compact">
                <div class="note-header">
                  <span class="note-date">${formatDate(note.date)}</span>
                  <span class="note-mood">${MOOD_EMOJIS[note.mood]}</span>
                </div>
                <div class="note-content">${note.note || ''}</div>
                <div class="note-actions">
                  <button class="btn-delete" onclick="deleteNote(${note.id})">🗑️ Supprimer</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Stage en cours : affichage normal
      html += `
        <div class="stage-notes-group active">
          <div class="stage-notes-header-active">
            <span class="stage-emoji">${stage.emoji}</span>
            <span>${stage.name}</span>
            <span class="stage-status">En cours</span>
          </div>
          <div class="stage-notes-content-active">
            ${stageNotes.map(note => `
              <div class="note-card">
                <div class="note-header">
                  <span class="note-date">${formatDate(note.date)}</span>
                  <span class="note-mood">${MOOD_EMOJIS[note.mood]}</span>
                </div>
                <div class="note-content">${note.note || ''}</div>
                <div class="note-actions">
                  <button class="btn-delete" onclick="deleteNote(${note.id})">🗑️ Supprimer</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

// Ouvrir/Fermer les notes d'un stage
function toggleStageNotes(stageId) {
  const content = document.getElementById(`notes-${stageId}`);
  const icon = document.getElementById(`toggle-${stageId}`);
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▲';
  } else {
    content.style.display = 'none';
    icon.textContent = '▼';
  }
}

// Supprimer une note
async function deleteNote(noteId) {
  if (confirm('Supprimer cette note ?')) {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erreur suppression note');
      
      await loadNotes();
      renderNotes();
      renderStats();
      showToast('Note supprimée ! 🗑️');
    } catch (error) {
      console.error('Erreur suppression note:', error);
      showToast('Erreur lors de la suppression ❌');
    }
  }
}

// Rendu des statistiques
function renderStats() {
  const container = document.getElementById('stats-container');
  
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">Pas encore de statistiques</div>
        <div class="empty-state-hint">Ajoute des notes pour voir tes stats d'humeur !</div>
      </div>
    `;
    return;
  }

  // Calculer les stats globales
  const moodStats = calculateMoodStats();
  const total = Object.values(moodStats).reduce((sum, count) => sum + count, 0);

  // Calculer les stats par stage
  const stageStats = {};
  stages.forEach(stage => {
    const stageNotes = notes.filter(n => n.stageId === stage.id);
    if (stageNotes.length > 0) {
      // Calculer la durée du stage en jours
      const dateDebut = new Date(stage.dateDebut);
      const dateFin = new Date(stage.dateFin);
      const diffTime = Math.abs(dateFin - dateDebut);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      stageStats[stage.id] = {
        stage: stage,
        notes: stageNotes,
        totalDays: diffDays,
        moodCounts: {
          excellent: stageNotes.filter(n => n.mood === 'excellent').length,
          bien: stageNotes.filter(n => n.mood === 'bien').length,
          moyen: stageNotes.filter(n => n.mood === 'moyen').length,
          difficile: stageNotes.filter(n => n.mood === 'difficile').length,
          penible: stageNotes.filter(n => n.mood === 'penible').length
        }
      };
    }
  });

  // Rendu global
  let html = `
    <div class="stats-card">
      <h3>😉 Vue globale</h3>
      ${renderMoodBars(moodStats, total)}
      <div class="stats-summary">
        <div class="stats-summary-value">${total}</div>
        <div class="stats-summary-label">notes au total</div>
      </div>
    </div>
  `;

  // Rendu par stage
  Object.values(stageStats).forEach(stageStat => {
    const stageTotal = Object.values(stageStat.moodCounts).reduce((sum, count) => sum + count, 0);
    html += `
      <div class="stats-card">
        <h3>${stageStat.stage.emoji} ${stageStat.stage.name}</h3>
        ${renderMoodBars(stageStat.moodCounts, stageTotal)}
        <div class="stats-summary">
          <div class="stats-summary-value">${stageTotal} / ${stageStat.totalDays}</div>
          <div class="stats-summary-label">jours notés sur ${stageStat.totalDays} jours de stage</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Rendu des barres d'humeur
function renderMoodBars(moodCounts, total) {
  const moods = ['excellent', 'bien', 'moyen', 'difficile', 'penible'];
  
  return moods.map(mood => {
    const count = moodCounts[mood] || 0;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    
    return `
      <div class="mood-stat">
        <div class="mood-stat-header">
          <div class="mood-stat-label">
            <span class="mood-stat-emoji">${MOOD_EMOJIS[mood]}</span>
            <span>${MOOD_LABELS[mood]}</span>
          </div>
          <div class="mood-stat-value">${percentage}% (${count})</div>
        </div>
        <div class="mood-stat-bar">
          <div class="mood-stat-fill ${mood}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Formater une date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Calculer les stats d'humeur
function calculateMoodStats() {
  const stats = {
    excellent: 0,
    bien: 0,
    moyen: 0,
    difficile: 0,
    penible: 0
  };

  notes.forEach(note => {
    if (stats[note.mood] !== undefined) {
      stats[note.mood]++;
    }
  });

  return stats;
}

// Modifier un stage
function editStage(stageId) {
  const stage = stages.find(s => s.id === stageId);
  if (!stage) return;

  // Créer un modal simple pour éditer
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>✏️ Modifier le stage</h2>
      <form id="edit-stage-form" onsubmit="return false;">
        <div class="form-group">
          <label>Nom du stage</label>
          <input type="text" id="edit-name" value="${stage.name}" required>
        </div>
        <div class="form-group">
          <label>Date de début</label>
          <input type="date" id="edit-debut" value="${stage.dateDebut}" required>
        </div>
        <div class="form-group">
          <label>Date de fin</label>
          <input type="date" id="edit-fin" value="${stage.dateFin}" required>
        </div>
        <div class="form-group">
          <label>Tuteur</label>
          <input type="text" id="edit-tuteur" value="${stage.tuteur}">
        </div>
        <div class="form-group">
          <label>Cadre</label>
          <input type="text" id="edit-cadre" value="${stage.cadre}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick="closeModal()">Annuler</button>
          <button type="button" class="btn-primary" onclick="saveStageEdit(${stageId})">💾 Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
}

// Sauvegarder les modifications du stage
async function saveStageEdit(stageId) {
  const stage = stages.find(s => s.id === stageId);
  if (!stage) return;

  const dateDebut = document.getElementById('edit-debut').value;
  const dateFin = document.getElementById('edit-fin').value;
  const joursTravailles = calculateWorkingDays(dateDebut, dateFin);

  try {
    const response = await fetch(`/api/stages/${stageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('edit-name').value,
        modality: stage.modality,
        emoji: stage.emoji,
        lieu: stage.lieu,
        tuteur: document.getElementById('edit-tuteur').value,
        cadre: document.getElementById('edit-cadre').value,
        date_debut: dateDebut,
        date_fin: dateFin,
        jours_travailles: joursTravailles
      })
    });

    if (!response.ok) throw new Error('Erreur modification stage');

    await loadStages();
    closeModal();
    renderStages();
    renderStats();
    showToast('Stage modifié ! ✏️');
  } catch (error) {
    console.error('Erreur modification stage:', error);
    showToast('Erreur lors de la modification ❌');
  }
}

// Fermer le modal
function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// Supprimer un stage
async function deleteStage(stageId) {
  const stage = stages.find(s => s.id === stageId);
  if (!stage) return;

  if (confirm(`Supprimer le stage "${stage.name}" ?\n\nToutes les notes associées seront aussi supprimées.`)) {
    try {
      const response = await fetch(`/api/stages/${stageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erreur suppression stage');

      await loadStages();
      await loadNotes();
      
      renderStages();
      renderNotes();
      renderStats();
      initStageSelector();
      showToast('Stage supprimé ! 🗑️');
    } catch (error) {
      console.error('Erreur suppression stage:', error);
      showToast('Erreur lors de la suppression ❌');
    }
  }
}

// Jours fériés français 2025
const JOURS_FERIES_2025 = [
  '2025-01-01', // Jour de l'an
  '2025-04-21', // Lundi de Pâques
  '2025-05-01', // Fête du travail
  '2025-05-08', // Victoire 1945
  '2025-05-29', // Ascension
  '2025-06-09', // Lundi de Pentecôte
  '2025-07-14', // Fête nationale
  '2025-08-15', // Assomption
  '2025-11-01', // Toussaint
  '2025-11-11', // Armistice 1918
  '2025-12-25'  // Noël
];

// Calculer les jours ouvrés (sans samedi, dimanche et jours fériés)
function calculateWorkingDays(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return 0;
  
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  
  if (debut > fin) return 0;
  
  let workingDays = 0;
  let currentDate = new Date(debut);
  
  while (currentDate <= fin) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Exclure samedi (6) et dimanche (0), et les jours fériés
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !JOURS_FERIES_2025.includes(dateString)) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

// Ouvrir le modal de création de stage
function openNewStageModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'new-stage-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2>➕ Nouveau Stage</h2>
      <form id="new-stage-form" onsubmit="return false;">
        <div class="form-group">
          <label>Modalité *</label>
          <select id="new-modality" required>
            <option value="">Choisis une modalité</option>
            <option value="nucleaire">☢️ Médecine Nucléaire</option>
            <option value="radiotherapie">💥 Radiothérapie</option>
            <option value="scanner">🌀 Scanner</option>
            <option value="irm">🧲 IRM</option>
            <option value="conventionnelle">🩻 Conventionnelle</option>
            <option value="interventionnelle">🫀 Interventionnelle</option>
            <option value="echographie">🦇 Échographie</option>
          </select>
        </div>
        <div class="form-group">
          <label>Lieu du stage *</label>
          <input type="text" id="new-lieu" placeholder="Ex: CHU Bordeaux" required>
        </div>
        <div class="form-group">
          <label>Nom du cadre</label>
          <input type="text" id="new-cadre" placeholder="Ex: Mme Dubois">
        </div>
        <div class="form-group">
          <label>Nom du tuteur</label>
          <input type="text" id="new-tuteur" placeholder="Ex: Dr Martin">
        </div>
        <div class="form-group">
          <label>Date de début *</label>
          <input type="date" id="new-debut" required>
        </div>
        <div class="form-group">
          <label>Date de fin *</label>
          <input type="date" id="new-fin" required>
        </div>
        <div id="workdays-info" class="workdays-display" style="display: none;">
          <span class="days-count">0</span> jours ouvrés<br>
          <span style="font-size: 0.9rem; font-weight: normal;">(sans weekends ni jours fériés)</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick="closeModal()">Annuler</button>
          <button type="button" class="btn-primary" onclick="createNewStage()">➕ Créer le stage</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
  
  // Écouter les changements de dates
  const debutInput = document.getElementById('new-debut');
  const finInput = document.getElementById('new-fin');
  
  const updateWorkdays = () => {
    const debut = debutInput.value;
    const fin = finInput.value;
    
    if (debut && fin) {
      const workdays = calculateWorkingDays(debut, fin);
      const display = document.getElementById('workdays-info');
      display.style.display = 'block';
      display.querySelector('.days-count').textContent = workdays;
    }
  };
  
  debutInput.addEventListener('change', updateWorkdays);
  finInput.addEventListener('change', updateWorkdays);
}

// Créer un nouveau stage
function createNewStage() {
  const modality = document.getElementById('new-modality').value;
  const lieu = document.getElementById('new-lieu').value.trim();
  const cadre = document.getElementById('new-cadre').value.trim();
  const tuteur = document.getElementById('new-tuteur').value.trim();
  const debut = document.getElementById('new-debut').value;
  const fin = document.getElementById('new-fin').value;
  
  if (!modality || !lieu || !debut || !fin) {
    showToast('Remplis tous les champs obligatoires ! 📝');
    return;
  }
  
  if (new Date(debut) > new Date(fin)) {
    showToast('La date de fin doit être après la date de début ! 📅');
    return;
  }
  
  // Trouver l'emoji et le nom de la modalité
  const MODALITY_INFO = {
    nucleaire: { emoji: '☢️', name: 'Médecine Nucléaire' },
    radiotherapie: { emoji: '💥', name: 'Radiothérapie' },
    scanner: { emoji: '🌀', name: 'Scanner' },
    irm: { emoji: '🧲', name: 'IRM' },
    conventionnelle: { emoji: '🩻', name: 'Conventionnelle' },
    interventionnelle: { emoji: '🫀', name: 'Interventionnelle' },
    echographie: { emoji: '🦇', name: 'Échographie' }
  };
  
  const info = MODALITY_INFO[modality];
  
  const joursTravailles = calculateWorkingDays(debut, fin);
  
  // Créer le nouveau stage via l'API
  fetch('/api/stages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lieu,
      modality: modality,
      emoji: info.emoji,
      lieu: lieu,
      tuteur: tuteur || 'Non renseigné',
      cadre: cadre || 'Non renseigné',
      date_debut: debut,
      date_fin: fin,
      jours_travailles: joursTravailles
    })
  })
  .then(response => {
    if (!response.ok) throw new Error('Erreur création stage');
    return loadStages();
  })
  .then(() => {
    closeModal();
    renderStages();
    initStageSelector();
    showToast(`Stage "${lieu}" créé ! 🎉`);
  })
  .catch(error => {
    console.error('Erreur création stage:', error);
    showToast('Erreur lors de la création ❌');
  });
}

// Initialiser le formulaire d'évaluation
function initEvaluationForm() {
  // Remplir le sélecteur de stages
  const evalStageSelect = document.getElementById('eval-stage-select');
  
  if (stages.length === 0) {
    evalStageSelect.innerHTML = '<option value="">Aucun stage - Crée-en un d\'abord !</option>';
  } else {
    evalStageSelect.innerHTML = '<option value="">Sélectionne un stage</option>';
    
    stages.forEach(stage => {
      const option = document.createElement('option');
      option.value = stage.id;
      option.textContent = `${stage.emoji} ${stage.name}`;
      evalStageSelect.appendChild(option);
    });
  }

  // Écouter les changements sur tous les radio buttons
  const radioButtons = document.querySelectorAll('#evaluation-form input[type="radio"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', updateEvaluationScore);
  });
}

// Mettre à jour le score en temps réel
function updateEvaluationScore() {
  const criteria = [
    'ponctualite', 'communication', 'esprit', 'confiance', 'adaptabilite',
    'protocoles', 'gestes', 'materiel', 'organisation', 'patient'
  ];

  let totalScore = 0;
  let answeredCount = 0;

  criteria.forEach(criterion => {
    const selectedRadio = document.querySelector(`input[name="${criterion}"]:checked`);
    if (selectedRadio) {
      totalScore += parseInt(selectedRadio.value);
      answeredCount++;
    }
  });

  // Afficher le score
  const scoreDisplay = document.getElementById('eval-score-display');
  const scoreValue = document.querySelector('.eval-score-value');
  const scoreInterpretation = document.getElementById('eval-score-interpretation');
  
  if (answeredCount > 0) {
    scoreValue.textContent = `${totalScore}/40`;
    
    // Afficher l'interprétation selon le score
    let interpretation = '';
    if (totalScore >= 40) {
      interpretation = '🌟 Tu es très solide, continue à cultiver tes forces.';
    } else if (totalScore >= 30) {
      interpretation = '👍 Bon niveau, quelques points à travailler pour progresser.';
    } else if (totalScore >= 20) {
      interpretation = '⚖️ Tu avances, mais il y a des axes clairs à améliorer.';
    } else {
      interpretation = '🚀 C\'est une base de départ, concentre-toi sur 2-3 critères prioritaires.';
    }
    
    scoreInterpretation.textContent = interpretation;
    scoreDisplay.style.display = 'block';
  } else {
    scoreDisplay.style.display = 'none';
  }
}

// Sauvegarder l'évaluation
async function saveEvaluation() {
  const stageId = document.getElementById('eval-stage-select').value;
  
  if (!stageId) {
    showToast('Sélectionne un stage ! 📚');
    return;
  }

  const criteria = [
    'ponctualite', 'communication', 'esprit', 'confiance', 'adaptabilite',
    'protocoles', 'gestes', 'materiel', 'organisation', 'patient'
  ];

  const scores = {};
  let totalScore = 0;
  let allAnswered = true;

  criteria.forEach(criterion => {
    const selectedRadio = document.querySelector(`input[name="${criterion}"]:checked`);
    if (selectedRadio) {
      scores[criterion] = parseInt(selectedRadio.value);
      totalScore += parseInt(selectedRadio.value);
    } else {
      allAnswered = false;
    }
  });

  if (!allAnswered) {
    showToast('Réponds à tous les critères ! 📝');
    return;
  }

  try {
    const response = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: parseInt(stageId),
        date: new Date().toISOString().split('T')[0],
        ponctualite: scores.ponctualite,
        communication: scores.communication,
        esprit: scores.esprit,
        confiance: scores.confiance,
        adaptabilite: scores.adaptabilite,
        protocoles: scores.protocoles,
        gestes: scores.gestes,
        materiel: scores.materiel,
        organisation: scores.organisation,
        patient: scores.patient,
        total_score: totalScore
      })
    });

    if (!response.ok) throw new Error('Erreur sauvegarde évaluation');

    await loadEvaluations();

    // Réinitialiser le formulaire
    const radioButtons = document.querySelectorAll('#evaluation-form input[type="radio"]');
    radioButtons.forEach(radio => radio.checked = false);
    document.getElementById('eval-score-display').style.display = 'none';

    renderEvaluationsHistory();
    showToast('Auto-évaluation enregistrée ! 💾');
  } catch (error) {
    console.error('Erreur sauvegarde évaluation:', error);
    showToast('Erreur lors de la sauvegarde ❌');
  }
}

// Afficher l'historique des évaluations
function renderEvaluationsHistory() {
  const container = document.getElementById('evaluations-list');
  
  if (evaluations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">Aucune auto-évaluation pour le moment</div>
        <div class="empty-state-hint">Remplis le formulaire ci-dessus !</div>
      </div>
    `;
    return;
  }

  const criteriaLabels = {
    ponctualite: 'Ponctualité',
    communication: 'Communication',
    esprit: 'Esprit d\'équipe',
    confiance: 'Confiance/Autonomie',
    adaptabilite: 'Adaptabilité',
    protocoles: 'Protocoles',
    gestes: 'Gestes techniques',
    materiel: 'Utilisation matériel',
    organisation: 'Organisation',
    patient: 'Relation patient'
  };

  container.innerHTML = evaluations.map(evaluation => {
    const stage = stages.find(s => s.id === evaluation.stageId);
    if (!stage) return '';

    return `
      <div class="evaluation-history-card">
        <div class="evaluation-history-header">
          <div class="evaluation-history-stage">
            ${stage.emoji} ${stage.name}
            <div style="font-size: 0.85rem; color: var(--gray-600); font-weight: normal;">
              ${formatDate(evaluation.date)}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="evaluation-history-score">${evaluation.totalScore}/40</div>
            <button class="btn-delete-eval" onclick="deleteEvaluation(${evaluation.id})">🗑️</button>
          </div>
        </div>
        <div class="evaluation-history-details">
          ${Object.keys(evaluation.scores).map(criterion => `
            <div class="evaluation-criterion-score">
              ${criteriaLabels[criterion]}: <strong>${evaluation.scores[criterion]}/4</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// === ÉVALUATION CLIMAT D'APPRENTISSAGE (Tuteur par Stagiaire) ===

async function loadEvaluationsTuteur() {
  try {
    const response = await fetch('/api/evaluations-tuteur');
    const data = await response.json();
    evaluationsTuteur = data.map(ev => ({
      ...ev,
      stageId: ev.stage_id
    }));
  } catch (error) {
    console.error('Erreur chargement évaluations tuteur:', error);
    evaluationsTuteur = [];
  }
}

function initEvalTuteurStagiaireForm() {
  const evalStageSelect = document.getElementById('eval-tuteur-stage-select');
  
  if (stages.length === 0) {
    evalStageSelect.innerHTML = '<option value="">Aucun stage - Crée-en un d\'abord !</option>';
  } else {
    evalStageSelect.innerHTML = '<option value="">Sélectionne un stage</option>';
    
    stages.forEach(stage => {
      const option = document.createElement('option');
      option.value = stage.id;
      option.textContent = `${stage.emoji} ${stage.name}`;
      evalStageSelect.appendChild(option);
    });
  }

  // Écouter les changements des checkboxes
  const checkboxes = document.querySelectorAll('.climat-criterion input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateEvalTuteurScore);
  });
}

function updateEvalTuteurScore() {
  const checkboxes = document.querySelectorAll('.climat-criterion input[type="checkbox"]');
  let totalScore = 0;
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      totalScore++;
    }
  });
  
  const scoreContainer = document.getElementById('eval-tuteur-stagiaire-score');
  const scoreNumber = document.querySelector('.climat-score-number');
  const resultName = document.querySelector('.climat-result-name');
  const resultDesc = document.querySelector('.climat-result-desc');
  
  if (totalScore > 0) {
    scoreNumber.textContent = `${totalScore}/10`;
    
    let profil = '';
    let profilName = '';
    let profilDesc = '';
    
    if (totalScore >= 9) {
      profil = 'exemplaire';
      profilName = 'Climat exemplaire';
      profilDesc = 'Accompagnement idéal, sentiment d\'intégration fort';
    } else if (totalScore >= 7) {
      profil = 'favorable';
      profilName = 'Climat favorable';
      profilDesc = 'Accompagnement solide et bienveillant';
    } else if (totalScore >= 4) {
      profil = 'mitige';
      profilName = 'Climat mitigé';
      profilDesc = 'Accompagnement présent mais perfectible';
    } else {
      profil = 'difficile';
      profilName = 'Climat difficile';
      profilDesc = 'Accompagnement à renforcer, pistes d\'amélioration';
    }
    
    scoreContainer.setAttribute('data-profil', profil);
    resultName.textContent = profilName;
    resultDesc.textContent = profilDesc;
    scoreContainer.style.display = 'block';
  } else {
    scoreContainer.style.display = 'none';
  }
}

async function saveEvalTuteurStagiaire() {
  const stageId = document.getElementById('eval-tuteur-stage-select').value;
  
  if (!stageId) {
    showToast('Sélectionne un stage ! 📚');
    return;
  }

  const checkboxes = document.querySelectorAll('.climat-criterion input[type="checkbox"]');
  let totalScore = 0;
  const scores = {};
  
  checkboxes.forEach((checkbox, index) => {
    const criterionName = `crit${index + 1}`;
    scores[criterionName] = checkbox.checked ? 1 : 0;
    if (checkbox.checked) totalScore++;
  });

  if (totalScore === 0) {
    showToast('Coche au moins un critère ! 📝');
    return;
  }

  try {
    const response = await fetch('/api/evaluations-tuteur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: parseInt(stageId),
        date: new Date().toISOString().split('T')[0],
        accueil: scores.crit1 === 1,
        role_explique: scores.crit2 === 1,
        questions_libres: scores.crit3 === 1,
        encourage_progresser: scores.crit4 === 1,
        retours_constructifs: scores.crit5 === 1,
        integration_equipe: scores.crit6 === 1,
        accompagnement_adapte: scores.crit7 === 1,
        outils_proposes: scores.crit8 === 1,
        valorise_reussites: scores.crit9 === 1,
        soutien_construction: scores.crit10 === 1,
        total_score: totalScore
      })
    });

    if (!response.ok) throw new Error('Erreur sauvegarde évaluation climat');

    await loadEvaluationsTuteur();

    // Réinitialiser le formulaire
    checkboxes.forEach(checkbox => checkbox.checked = false);
    document.getElementById('eval-tuteur-stagiaire-score').style.display = 'none';

    renderEvalTuteurHistory();
    showToast('Évaluation climat enregistrée ! 💾');
  } catch (error) {
    console.error('Erreur sauvegarde évaluation climat:', error);
    showToast('Erreur lors de la sauvegarde ❌');
  }
}

function renderEvalTuteurHistory() {
  const container = document.getElementById('eval-tuteur-list');
  
  if (evaluationsTuteur.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌱</div>
        <div class="empty-state-text">Aucune évaluation climat pour le moment</div>
        <div class="empty-state-hint">Remplis le formulaire ci-dessus !</div>
      </div>
    `;
    return;
  }

  container.innerHTML = evaluationsTuteur.map(evaluation => {
    const stage = stages.find(s => s.id === evaluation.stageId);
    if (!stage) return '';

    return `
      <div class="evaluation-history-card">
        <div class="evaluation-history-header">
          <div class="evaluation-history-stage">
            ${stage.emoji} ${stage.name}
            <div style="font-size: 0.85rem; color: var(--gray-600); font-weight: normal;">
              ${formatDate(evaluation.date)}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="evaluation-history-score">${evaluation.total_score}/10</div>
            <button class="btn-delete-eval" onclick="deleteEvalClimat(${evaluation.id})">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// === GRILLE TUTEUR ===

function initTuteurGrid() {
  const checkboxes = document.querySelectorAll('#tuteur-view input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateTuteurScore);
  });
  updateTuteurScore();
}

function updateTuteurScore() {
  const checkboxes = document.querySelectorAll('#tuteur-view input[type="checkbox"]');
  let totalScore = 0;
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      totalScore++;
    }
  });
  
  const scoreDisplay = document.querySelector('.tuteur-score-value');
  const profilDisplay = document.getElementById('tuteur-profil');
  
  if (scoreDisplay) {
    scoreDisplay.textContent = `${totalScore}/21`;
  }
  
  if (profilDisplay) {
    const profil = getTuteurProfil(totalScore);
    profilDisplay.innerHTML = `
      <div class="tuteur-profil-result ${profil.class}">
        <div class="tuteur-profil-badge">${profil.emoji}</div>
        <div class="tuteur-profil-info">
          <div class="tuteur-profil-name">${profil.name}</div>
          <div class="tuteur-profil-desc">${profil.desc}</div>
        </div>
      </div>
    `;
  }
}

function getTuteurProfil(score) {
  if (score >= 19) {
    return {
      emoji: '🟢',
      name: 'Tuteur structurant',
      desc: 'Modèle à valoriser',
      class: 'profil-structurant'
    };
  } else if (score >= 13) {
    return {
      emoji: '🔵',
      name: 'Tuteur technique',
      desc: 'Bon sur le geste, à enrichir sur la posture',
      class: 'profil-technique'
    };
  } else if (score >= 7) {
    return {
      emoji: '🟠',
      name: 'Tuteur distant',
      desc: 'Présent mais peu impliqué relationnellement',
      class: 'profil-distant'
    };
  } else {
    return {
      emoji: '🔴',
      name: 'Tuteur déficient',
      desc: 'Risque de freiner l\'apprentissage',
      class: 'profil-deficient'
    };
  }
}

// Supprimer une auto-évaluation
async function deleteEvaluation(evalId) {
  if (!confirm('Supprimer cette auto-évaluation ?')) return;
  
  try {
    const response = await fetch(`/api/evaluations/${evalId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Erreur suppression');
    
    await loadEvaluations();
    renderEvaluationsHistory();
    showToast('Auto-évaluation supprimée ! 🗑️');
  } catch (error) {
    console.error('Erreur suppression évaluation:', error);
    showToast('Erreur lors de la suppression ❌');
  }
}

// Supprimer une évaluation climat
async function deleteEvalClimat(evalId) {
  if (!confirm('Supprimer cette évaluation climat ?')) return;
  
  try {
    const response = await fetch(`/api/evaluations-tuteur/${evalId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Erreur suppression');
    
    await loadEvaluationsTuteur();
    renderEvalTuteurHistory();
    showToast('Évaluation climat supprimée ! 🗑️');
  } catch (error) {
    console.error('Erreur suppression évaluation climat:', error);
    showToast('Erreur lors de la suppression ❌');
  }
}

// Exposer les fonctions globalement
window.deleteNote = deleteNote;
window.editStage = editStage;
window.saveStageEdit = saveStageEdit;
window.closeModal = closeModal;
window.deleteStage = deleteStage;
window.openNewStageModal = openNewStageModal;
window.createNewStage = createNewStage;
window.toggleStageNotes = toggleStageNotes;
window.deleteEvaluation = deleteEvaluation;
window.deleteEvalClimat = deleteEvalClimat;
