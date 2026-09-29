/**
 * UI & HUD Controller
 * Manages distance/speed/altitude HUD, floating toast alerts, power meter, and modals.
 */

export class UIManager {
  constructor() {
    this.distanceVal = document.getElementById('distanceVal');
    this.bestDistanceVal = document.getElementById('bestDistanceVal');
    this.altitudeVal = document.getElementById('altitudeVal');
    this.speedVal = document.getElementById('speedVal');
    this.boostPips = document.getElementById('boostPips');
    this.boostsCard = document.getElementById('boostsCard');
    this.toastContainer = document.getElementById('toast-container');
    this.launchControls = document.getElementById('launch-controls');
    this.powerBar = document.getElementById('powerBar');
    this.powerPercent = document.getElementById('powerPercent');
    this.launchBtn = document.getElementById('launchBtn');
    this.airBoostTrigger = document.getElementById('air-boost-trigger');
    this.resultsModal = document.getElementById('resultsModal');
    this.helpModal = document.getElementById('helpModal');
    this.audioBtn = document.getElementById('audioBtn');
    this.jetpackDevBtn = document.getElementById('jetpackDevBtn');
    this.helpBtn = document.getElementById('helpBtn');
    this.closeHelpBtn = document.getElementById('closeHelpBtn');
    this.replayBtn = document.getElementById('replayBtn');
    this.newRecordBadge = document.getElementById('newRecordBadge');

    // Title screen and destination scaffold modal elements
    this.titleScreen = document.getElementById('titleScreen');
    this.titlePlayBtn = document.getElementById('titlePlayBtn');
    this.titleShopBtn = document.getElementById('titleShopBtn');
    this.titleAccountBtn = document.getElementById('titleAccountBtn');
    this.titleCustomizeBtn = document.getElementById('titleCustomizeBtn');
    this.titleSelectionBtn = document.getElementById('titleSelectionBtn');

    this.shopModal = document.getElementById('shopModal');
    this.closeShopBtn = document.getElementById('closeShopBtn');

    this.accountModal = document.getElementById('accountModal');
    this.closeAccountBtn = document.getElementById('closeAccountBtn');
    this.profileBestDist = document.getElementById('profileBestDist');

    this.customizeModal = document.getElementById('customizeModal');
    this.closeCustomizeBtn = document.getElementById('closeCustomizeBtn');

    this.selectionModal = document.getElementById('selectionModal');
    this.closeSelectionBtn = document.getElementById('closeSelectionBtn');

    this.titleReturnBtn = document.getElementById('titleReturnBtn');

    // Results modal elements
    this.finalDistance = document.getElementById('finalDistance');
    this.finalAllTimeBest = document.getElementById('finalAllTimeBest');
    this.nameEntryCard = document.getElementById('nameEntryCard');
    this.playerNameInput = document.getElementById('playerNameInput');
    this.saveScoreBtn = document.getElementById('saveScoreBtn');
    this.leaderboardList = document.getElementById('leaderboardList');
    this.finalAltitude = document.getElementById('finalAltitude');
    this.finalSpeed = document.getElementById('finalSpeed');
    this.statTnt = document.getElementById('statTnt');
    this.statBounces = document.getElementById('statBounces');

    // Load top 3 leaderboard and best distance
    this.leaderboard = this.loadLeaderboard();
    this.bestDistance = parseFloat(localStorage.getItem('capybara_best_distance') || '0.0');
    if (this.leaderboard.length > 0 && this.leaderboard[0].distance > this.bestDistance) {
      this.bestDistance = this.leaderboard[0].distance;
      localStorage.setItem('capybara_best_distance', this.bestDistance.toFixed(1));
    }
    this.updateBestDisplay();
    this.bindLeaderboardInputs();
  }

  loadLeaderboard() {
    try {
      const saved = localStorage.getItem('capybara_top3_leaderboard');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3);
        }
      }
    } catch (e) {
      console.warn('Could not read leaderboard from localStorage', e);
    }
    // Default initial top 3 records
    return [
      { name: "CHILL_CAPY", distance: 350.0 },
      { name: "YUZU_PILOT", distance: 220.0 },
      { name: "ZEN_BOI", distance: 120.0 }
    ];
  }

  saveLeaderboard() {
    try {
      localStorage.setItem('capybara_top3_leaderboard', JSON.stringify(this.leaderboard));
    } catch (e) {
      console.warn('Could not write leaderboard to localStorage', e);
    }
  }

  bindLeaderboardInputs() {
    const handleSave = () => {
      if (!this.pendingDistance) return;
      let name = (this.playerNameInput.value || '').trim().toUpperCase();
      if (!name) name = 'CAPY_PRO';
      name = name.substring(0, 12);

      const newEntry = { name, distance: this.pendingDistance };
      this.leaderboard.push(newEntry);
      this.leaderboard.sort((a, b) => b.distance - a.distance);
      this.leaderboard = this.leaderboard.slice(0, 3);

      const placedRank = this.leaderboard.indexOf(newEntry);
      this.saveLeaderboard();

      if (this.pendingDistance > this.bestDistance) {
        this.bestDistance = this.pendingDistance;
        localStorage.setItem('capybara_best_distance', this.bestDistance.toFixed(1));
        this.updateBestDisplay();
        this.finalAllTimeBest.textContent = `${this.bestDistance.toFixed(1)} m`;
        this.newRecordBadge.classList.remove('hidden');
      }

      this.pendingDistance = null;
      this.nameEntryCard.classList.add('hidden');
      this.renderLeaderboard(placedRank);
    };

    this.saveScoreBtn.addEventListener('click', handleSave);
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    });
  }

  renderLeaderboard(highlightRank = null) {
    this.leaderboardList.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];

    this.leaderboard.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = `leaderboard-row rank-${idx + 1} ${highlightRank === idx ? 'highlight' : ''}`;
      
      const medalSpan = document.createElement('span');
      medalSpan.className = 'rank-medal';
      medalSpan.textContent = medals[idx] || `${idx + 1}.`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = entry.name;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'player-score';
      scoreSpan.textContent = `${entry.distance.toFixed(1)} m`;

      row.appendChild(medalSpan);
      row.appendChild(nameSpan);
      row.appendChild(scoreSpan);
      this.leaderboardList.appendChild(row);
    });
  }

  updateBestDisplay() {
    this.bestDistanceVal.textContent = `BEST: ${this.bestDistance.toFixed(1)} m`;
    if (this.profileBestDist) {
      this.profileBestDist.textContent = `${this.bestDistance.toFixed(1)} m`;
    }
  }

  updateHUD(distanceMeters, altitudeMeters, speedKmh) {
    this.distanceVal.innerHTML = `${Math.max(0, distanceMeters).toFixed(1)} <small>m</small>`;
    this.altitudeVal.textContent = `${Math.max(0, Math.round(altitudeMeters))} m`;
    this.speedVal.textContent = `${Math.max(0, Math.round(speedKmh))} km/h`;
  }

  updatePowerMeter(power01) {
    const pct = Math.round(power01 * 100);
    this.powerBar.style.width = `${pct}%`;
    this.powerPercent.textContent = `${pct}%`;
  }

  updateBoosts(boostsRemaining) {
    this.currentBoosts = Math.max(0, Math.floor(boostsRemaining));
    if (!this.boostPips) return;

    this.boostPips.innerHTML = '';
    if (this.currentBoosts === 0) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      pip.title = 'No Zen Boost Available';
      pip.textContent = '🍊';
      this.boostPips.appendChild(pip);
    } else {
      for (let i = 0; i < this.currentBoosts; i++) {
        const pip = document.createElement('span');
        pip.className = 'pip active';
        pip.title = `Zen Boost (${i + 1}/${this.currentBoosts})`;
        pip.textContent = '🍊';
        this.boostPips.appendChild(pip);
      }
    }

    if (this.currentBoosts > 0) {
      this.airBoostTrigger.classList.remove('hidden');
    } else {
      this.airBoostTrigger.classList.add('hidden');
    }
  }

  setJetpackActive(active) {
    if (active) {
      if (this.boostsCard) {
        const label = this.boostsCard.querySelector('.hud-label');
        if (label) label.textContent = 'JETPACK';
        if (this.boostPips) {
          this.boostPips.innerHTML = '<span class="pip active" title="Jetpack Mode">🎒</span>';
        }
        const hint = this.boostsCard.querySelector('.boost-hint');
        if (hint) hint.textContent = '[HOLD SPACE / TOUCH]';
      }
      if (this.jetpackDevBtn) {
        this.jetpackDevBtn.classList.add('active');
      }
    } else {
      if (this.boostsCard) {
        const label = this.boostsCard.querySelector('.hud-label');
        if (label) label.textContent = 'ZEN BOOST';
        const hint = this.boostsCard.querySelector('.boost-hint');
        if (hint) hint.textContent = '[SPACE / TAP]';
      }
      this.updateBoosts(this.currentBoosts ?? 1);
      if (this.jetpackDevBtn) {
        this.jetpackDevBtn.classList.remove('active');
      }
    }
  }

  showLaunchControls(show) {
    if (show) {
      this.launchControls.classList.remove('hidden');
      this.airBoostTrigger.classList.add('hidden');
    } else {
      this.launchControls.classList.add('hidden');
    }
  }

  setChargingState(isCharging) {
    if (isCharging) {
      this.launchBtn.classList.add('charging');
      this.launchBtn.textContent = 'CHARGING... RELEASE TO FIRE!';
    } else {
      this.launchBtn.classList.remove('charging');
      this.launchBtn.textContent = 'HOLD TO CHARGE & FIRE';
    }
  }

  showToast(text, type = 'boost') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = text;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 1200);
  }

  showResults(stats) {
    this.airBoostTrigger.classList.add('hidden');
    this.finalDistance.textContent = `${stats.distance.toFixed(1)} m`;
    this.finalAltitude.textContent = `${Math.round(stats.maxAltitude)} m`;
    this.finalSpeed.textContent = `${Math.round(stats.topSpeed)} km/h`;
    this.statTnt.textContent = stats.tntHit;
    this.statBounces.textContent = stats.bounces;

    // Compare with all-time best
    const isNewAllTime = stats.distance > this.bestDistance;
    this.finalAllTimeBest.textContent = `${Math.max(this.bestDistance, stats.distance).toFixed(1)} m`;

    if (isNewAllTime) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    // Check if current run qualifies for Top 3
    const qualifies = this.leaderboard.length < 3 || stats.distance > this.leaderboard[this.leaderboard.length - 1].distance;

    if (qualifies && stats.distance > 0.5) {
      this.pendingDistance = stats.distance;
      this.playerNameInput.value = '';
      this.nameEntryCard.classList.remove('hidden');
      setTimeout(() => this.playerNameInput.focus(), 300);
      this.renderLeaderboard();
    } else {
      this.pendingDistance = null;
      this.nameEntryCard.classList.add('hidden');
      this.renderLeaderboard();
    }

    this.resultsModal.classList.remove('hidden');
  }

  hideResults() {
    this.resultsModal.classList.add('hidden');
    this.nameEntryCard.classList.add('hidden');
    this.pendingDistance = null;
  }

  showHelp(show) {
    if (show) {
      this.helpModal.classList.remove('hidden');
    } else {
      this.helpModal.classList.add('hidden');
    }
  }

  updateAudioBtn(isMuted) {
    this.audioBtn.textContent = isMuted ? '🔇' : '🔊';
  }

  showTitleScreen(show) {
    if (show) {
      this.titleScreen.classList.remove('hidden');
    } else {
      this.titleScreen.classList.add('hidden');
    }
  }

  showShop(show) {
    if (show) {
      this.shopModal.classList.remove('hidden');
    } else {
      this.shopModal.classList.add('hidden');
    }
  }

  showAccount(show) {
    if (show) {
      if (this.profileBestDist) {
        this.profileBestDist.textContent = `${this.bestDistance.toFixed(1)} m`;
      }
      this.accountModal.classList.remove('hidden');
    } else {
      this.accountModal.classList.add('hidden');
    }
  }

  showCustomize(show) {
    if (show) {
      this.customizeModal.classList.remove('hidden');
    } else {
      this.customizeModal.classList.add('hidden');
    }
  }

  showSelection(show) {
    if (show) {
      this.selectionModal.classList.remove('hidden');
    } else {
      this.selectionModal.classList.add('hidden');
    }
  }
}
