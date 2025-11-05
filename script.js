document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DA INTERFACE (DOM) ---
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');

    const p1Elements = {
        nameEl: document.getElementById('p1-pokemon-name'),
        hpBarEl: document.getElementById('p1-hp-bar'),
        hpValEl: document.getElementById('p1-hp-value'),
        spriteEl: document.getElementById('p1-sprite'),
    };

    const p2Elements = {
        nameEl: document.getElementById('p2-pokemon-name'),
        hpBarEl: document.getElementById('p2-hp-bar'),
        spriteEl: document.getElementById('p2-sprite'),
    };

    const logEl = document.getElementById('battle-log');
    const movesBox = document.getElementById('moves-box');
    const teamSelectionBox = document.getElementById('team-selection-box');

    // --- ESTADO DO JOGO ---
    let player1, player2;
    let currentPlayer;
    let battlePhase = 'choosing_move'; // pode ser 'choosing_move' ou 'switching_pokemon'

    // --- FUNÇÕES DE SETUP DA BATALHA ---

    function createPokemonInstance(pokemonData) {
        const level = 50;
        const maxHP = Math.floor(((pokemonData.stats.hp * 2 * level) / 100) + level + 10);

        // Atribui 4 movimentos aleatórios UMA ÚNICA VEZ
        let assignedMoves = [];
        let availableMoves = [...MOVES];
        for (let i = 0; i < 4; i++) {
            if (availableMoves.length === 0) break;
            const moveIndex = Math.floor(Math.random() * availableMoves.length);
            assignedMoves.push(availableMoves[moveIndex]);
            availableMoves.splice(moveIndex, 1);
        }

        return {
            ...pokemonData,
            level: level,
            currentHP: maxHP,
            maxHP: maxHP,
            moves: assignedMoves,
            isFainted: false,
        };
    }

    function setupTeams() {
        player1 = { team: [], activePokemonIndex: 0 };
        player2 = { team: [], activePokemonIndex: 0 };
        const availablePokemon = [...POKEMONS];

        for (let i = 0; i < 6; i++) {
            let randIndex = Math.floor(Math.random() * availablePokemon.length);
            player1.team.push(createPokemonInstance(availablePokemon[randIndex]));
            availablePokemon.splice(randIndex, 1);

            randIndex = Math.floor(Math.random() * availablePokemon.length);
            player2.team.push(createPokemonInstance(availablePokemon[randIndex]));
            availablePokemon.splice(randIndex, 1);
        }
    }

    function startGame() {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        setupTeams();
        currentPlayer = player1;
        updateUI();
        logMessage(`A batalha começa! Vez do Jogador 1.`);
        displayPlayerMoves();
        battlePhase = 'choosing_move';
    }

    // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

    function updateUI() {
        const p1Active = player1.team[player1.activePokemonIndex];
        const p2Active = player2.team[player2.activePokemonIndex];

        // Player 1
        p1Elements.nameEl.textContent = p1Active.name;
        p1Elements.spriteEl.src = p1Active.sprites.back;
        const p1HpPercent = (p1Active.currentHP / p1Active.maxHP) * 100;
        p1Elements.hpBarEl.style.width = `${p1HpPercent}%`;
        p1Elements.hpValEl.textContent = `${p1Active.currentHP}/${p1Active.maxHP}`;
        updateHpBarColor(p1Elements.hpBarEl, p1HpPercent);

        // Player 2
        p2Elements.nameEl.textContent = p2Active.name;
        p2Elements.spriteEl.src = p2Active.sprites.front;
        const p2HpPercent = (p2Active.currentHP / p2Active.maxHP) * 100;
        p2Elements.hpBarEl.style.width = `${p2HpPercent}%`;
        updateHpBarColor(p2Elements.hpBarEl, p2HpPercent);
    }

    function updateHpBarColor(bar, percent) {
        if (percent < 20) {
            bar.style.backgroundColor = '#f44336'; // Vermelho
        } else if (percent < 50) {
            bar.style.backgroundColor = '#ffeb3b'; // Amarelo
        } else {
            bar.style.backgroundColor = '#32CD32'; // Verde
        }
    }
    
    function logMessage(message) {
        logEl.textContent = message;
    }

    function displayPlayerMoves() {
        movesBox.innerHTML = '';
        teamSelectionBox.innerHTML = '';
        const activePokemon = currentPlayer.team[currentPlayer.activePokemonIndex];

        activePokemon.moves.forEach(move => {
            const button = document.createElement('button');
            button.textContent = move.name;
            button.className = 'move-button';
            button.onclick = () => handleMoveSelection(move);
            movesBox.appendChild(button);
        });
    }

    // --- LÓGICA DO TURNO DE BATALHA ---

    function handleMoveSelection(move) {
        if (battlePhase !== 'choosing_move') return;

        const attacker = currentPlayer.team[currentPlayer.activePokemonIndex];
        const defender = (currentPlayer === player1 ? player2 : player1).team[(currentPlayer === player1 ? player2 : player1).activePokemonIndex];
        
        // Desabilita botões para evitar cliques duplos
        movesBox.innerHTML = ''; 

        performAttack(attacker, defender, move);
    }

    async function performAttack(attacker, defender, move) {
        logMessage(`${attacker.name} usou ${move.name}!`);
        await delay(1500);

        if (Math.random() * 100 > move.accuracy) {
            logMessage(`${attacker.name} errou o ataque!`);
            await delay(1500);
            switchTurn(); // Mesmo errando, o turno passa
            return;
        }

        const { damage, effectiveness } = calculateDamage(attacker, defender, move);
        defender.currentHP = Math.max(0, defender.currentHP - damage);
        
        updateUI();
        await delay(1000);

        if (effectiveness > 1) logMessage("Foi super efetivo!");
        else if (effectiveness < 1 && effectiveness > 0) logMessage("Não foi muito efetivo...");
        else if (effectiveness === 0) logMessage("Não teve efeito!");

        await delay(1500);

        if (defender.currentHP === 0) {
            defender.isFainted = true;
            logMessage(`${defender.name} foi derrotado!`);
            await delay(1500);
            handleFaint();
        } else {
            switchTurn();
        }
    }
    
    function calculateDamage(attacker, defender, move) {
        const level = attacker.level;
        const power = move.power;
        const attack = attacker.stats.attack;
        const defense = defender.stats.defense;
        
        let typeEffectiveness = 1;
        defender.types.forEach(type => {
            const moveTypeChart = TYPE_CHART[move.type];
            if (moveTypeChart && moveTypeChart[type] !== undefined) {
                typeEffectiveness *= moveTypeChart[type];
            }
        });

        const stab = attacker.types.includes(move.type) ? 1.5 : 1;
        const randomFactor = Math.random() * (1 - 0.85) + 0.85;
        const damage = Math.floor(((((2 * level / 5 + 2) * power * (attack / defense)) / 50) + 2) * stab * typeEffectiveness * randomFactor);

        return { damage, effectiveness: typeEffectiveness };
    }

    function switchTurn() {
        const winner = checkWinCondition();
        if (winner) {
            endGame(winner);
            return;
        }

        currentPlayer = (currentPlayer === player1) ? player2 : player1;
        const playerNumber = (currentPlayer === player1) ? 1 : 2;
        logMessage(`É a vez do Jogador ${playerNumber}. O que fazer?`);
        displayPlayerMoves();
        battlePhase = 'choosing_move';
    }

    function handleFaint() {
        const winner = checkWinCondition();
        if (winner) {
            endGame(winner);
            return;
        }
        
        const faintedPlayer = (currentPlayer === player1) ? player2 : player1;
        const faintedPlayerNumber = (faintedPlayer === player1) ? 1 : 2;
        logMessage(`Jogador ${faintedPlayerNumber}, escolha seu próximo Pokémon.`);
        displayTeamSelection(faintedPlayer);
        battlePhase = 'switching_pokemon';
    }

    function displayTeamSelection(player) {
        movesBox.innerHTML = '';
        teamSelectionBox.innerHTML = '';

        player.team.forEach((pokemon, index) => {
            const button = document.createElement('button');
            button.textContent = pokemon.name;
            button.className = 'team-button';

            if (pokemon.isFainted) {
                button.classList.add('fainted');
                button.disabled = true;
            } else {
                button.onclick = () => {
                    player.activePokemonIndex = index;
                    teamSelectionBox.innerHTML = '';
                    updateUI();
                    logMessage(`${pokemon.name} entra na batalha!`);
                    // Após a troca, o turno passa para o outro jogador
                    setTimeout(switchTurn, 1500);
                };
            }
            teamSelectionBox.appendChild(button);
        });
    }

    function checkWinCondition() {
        if (player1.team.every(p => p.isFainted)) return 2; // Jogador 2 vence
        if (player2.team.every(p => p.isFainted)) return 1; // Jogador 1 vence
        return null; // Ninguém venceu ainda
    }

    function endGame(winner) {
        battlePhase = 'game_over';
        logMessage(`Fim da batalha!`);
        document.getElementById('winner-message').textContent = `Jogador ${winner} venceu!`;
        gameOverScreen.classList.remove('hidden');
    }
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- EVENT LISTENERS ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
});