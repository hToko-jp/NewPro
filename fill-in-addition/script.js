class Game {
    constructor() {
        this.score = 0;
        this.timeLeft = 60;
        this.isPlaying = false;
        this.timerInterval = null;
        this.currentProblem = {};
        this.userInput = "";

        // DOM Elements
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen'),
            ranking: document.getElementById('ranking-screen')
        };
        this.scoreEl = document.getElementById('score');
        this.timerEl = document.getElementById('timer');
        this.equationEl = document.getElementById('equation');
        this.finalScoreEl = document.getElementById('final-score');
        this.feedbackEl = document.getElementById('feedback');

        // High Score Elements
        this.playerNameInput = document.getElementById('player-name');
        this.saveScoreBtn = document.getElementById('save-score-btn');
        this.rankingListEl = document.getElementById('ranking-list');
        this.restartBtn = document.getElementById('restart-btn');

        // Bind events
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('ranking-btn').addEventListener('click', () => this.showRanking());
        document.getElementById('back-home-btn').addEventListener('click', () => this.reset());

        this.saveScoreBtn.addEventListener('click', () => this.saveScoreHandler());
        this.restartBtn.addEventListener('click', () => {
            // If they skip saving, just go to start
            this.reset();
        });

        // Input setup
        this.setupInputs();
    }

    setupInputs() {
        // On-screen buttons
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.target.dataset.val;
                const action = e.target.dataset.action;

                if (action === 'delete') {
                    this.handleInput('Backspace');
                } else if (action === 'enter') {
                    this.handleInput('Enter');
                } else if (val !== undefined) {
                    this.handleInput(val);
                }
            });
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            // Allow numbers, backspace, enter
            // Only allowed if game is playing
            if (this.isPlaying) {
                if ((e.key >= '0' && e.key <= '9') || e.key === 'Backspace' || e.key === 'Enter') {
                    this.handleInput(e.key);
                }
            }
        });
    }

    handleInput(key) {
        if (!this.isPlaying) return;

        if (key === 'Enter') {
            this.checkAnswer();
        } else if (key === 'Backspace') {
            this.userInput = this.userInput.slice(0, -1);
            this.updateDisplay();
        } else {
            // Limit input length to 3 digits
            if (this.userInput.length < 3) {
                this.userInput += key;
                this.updateDisplay();
            }
        }
    }

    start() {
        this.score = 0;
        this.timeLeft = 60;
        this.isPlaying = true;
        this.userInput = "";

        this.updateScore();
        this.updateTimer();

        this.switchScreen('game');
        this.nextProblem();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 0) {
                this.end();
            }
        }, 1000);
    }

    reset() {
        this.switchScreen('start');
    }

    end() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        this.finalScoreEl.textContent = this.score;
        this.playerNameInput.value = ""; // Clear previous name

        // UI State for result screen
        this.saveScoreBtn.parentElement.classList.remove('hidden');
        this.restartBtn.classList.add('hidden'); // Hide simple restart, encourage save
        this.restartBtn.textContent = "ほぞん せずに もどる"; // Change text to be clear
        this.restartBtn.classList.remove('hidden'); // Actually show it as a skip option

        this.switchScreen('result');
    }

    showRanking() {
        this.renderRanking();
        this.switchScreen('ranking');
    }

    saveScoreHandler() {
        const name = this.playerNameInput.value.trim() || "名無しさん";
        const newScore = { name: name, score: this.score, date: new Date().toISOString() };

        const scores = this.getScores();
        scores.push(newScore);

        // Sort by score desc
        scores.sort((a, b) => b.score - a.score);

        // Keep top 20
        const topScores = scores.slice(0, 20);

        localStorage.setItem('fill_in_math_scores', JSON.stringify(topScores));

        // Go to ranking
        this.showRanking();
    }

    getScores() {
        const stored = localStorage.getItem('fill_in_math_scores');
        return stored ? JSON.parse(stored) : [];
    }

    renderRanking() {
        const scores = this.getScores();
        let html = `
            <div class="ranking-item header">
                <span class="rank-num">#</span>
                <span style="flex:1; text-align:left; padding-left:1rem;">Name</span>
                <span>Score</span>
            </div>
        `;

        if (scores.length === 0) {
            html += `<div class="ranking-item" style="justify-content:center; opacity:0.6;">まだ データが ないよ</div>`;
        } else {
            scores.forEach((s, index) => {
                const rank = index + 1;
                let rankClass = "";
                if (rank === 1) rankClass = "rank-1";
                if (rank === 2) rankClass = "rank-2";
                if (rank === 3) rankClass = "rank-3";

                html += `
                    <div class="ranking-item ${rankClass}">
                        <span class="rank-num">${rank}</span>
                        <span style="flex:1; text-align:left; padding-left:1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span>
                        <span>${s.score}</span>
                    </div>
                `;
            });
        }

        this.rankingListEl.innerHTML = html;
    }

    switchScreen(screenName) {
        Object.values(this.screens).forEach(el => el.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }

    updateTimer() {
        this.timerEl.textContent = this.timeLeft;
        if (this.timeLeft <= 10) {
            this.timerEl.style.color = '#ef4444'; // Red warning
        } else {
            this.timerEl.style.color = '#ffffff';
        }
    }

    updateScore() {
        this.scoreEl.textContent = this.score;
        // Animation
        this.scoreEl.classList.remove('pop');
        void this.scoreEl.offsetWidth; // trigger reflow
        this.scoreEl.classList.add('pop');
    }

    nextProblem() {
        this.userInput = "";
        this.currentProblem = this.generateProblem();
        this.renderEquation();
        this.feedbackEl.textContent = "";
    }

    generateProblem() {
        // Logic: A + B = C
        const type = Math.random() < 0.5 ? 'left' : 'right'; // Hide A or B
        const sum = Math.floor(Math.random() * 19) + 2; // 2 to 20
        const a = Math.floor(Math.random() * (sum - 1)) + 1;
        const b = sum - a;

        return {
            a: a,
            b: b,
            c: sum,
            hidden: type
        };
    }

    renderEquation() {
        const { a, b, c, hidden } = this.currentProblem;
        let html = '';

        if (hidden === 'left') {
            html = `<span class="blank">?</span> <span>+</span> <span>${b}</span> <span>=</span> <span>${c}</span>`;
        } else {
            html = `<span>${a}</span> <span>+</span> <span class="blank">?</span> <span>=</span> <span>${c}</span>`;
        }

        this.equationEl.innerHTML = html;
        this.updateDisplay(); // Show empty input initially
    }

    updateDisplay() {
        const blankEl = this.equationEl.querySelector('.blank');
        if (blankEl) {
            blankEl.textContent = this.userInput === "" ? "?" : this.userInput;

            // Visual feedback as they type
            if (this.userInput !== "") {
                blankEl.style.color = '#ffffff';
            } else {
                blankEl.style.color = '#ffeb3b';
            }
        }
    }

    checkAnswer() {
        if (this.userInput === "") return;

        const val = parseInt(this.userInput, 10);
        let correctVal;

        if (this.currentProblem.hidden === 'left') {
            correctVal = this.currentProblem.a; // ? was a
        } else {
            correctVal = this.currentProblem.b; // ? was b
        }

        if (val === correctVal) {
            // Correct
            this.score += 10; // Simple scoring
            this.updateScore();
            this.showFeedback(true);
            this.nextProblem();
        } else {
            // Incorrect
            this.showFeedback(false);
            this.shakeScreen();
            this.userInput = "";
            this.updateDisplay();
        }
    }

    showFeedback(isCorrect) {
        // Optional confetti or simple flash
        if (!isCorrect) {
            this.feedbackEl.textContent = "ざんねん！";
            this.feedbackEl.style.color = '#ef4444';
        }
    }

    shakeScreen() {
        this.equationEl.classList.add('shake');
        setTimeout(() => this.equationEl.classList.remove('shake'), 400);
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
