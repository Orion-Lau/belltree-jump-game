const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const WORLD_WIDTH = 3200;
const GROUND_Y = 486;
const MAX_LEVEL = 3;
const NORMAL_MOVE_SPEED = 242;
const DASH_SPEED = 460;

const hud = {
  level: document.querySelector("#level"),
  lives: document.querySelector("#lives"),
  bells: document.querySelector("#bells"),
  letters: document.querySelector("#letters"),
  weeds: document.querySelector("#weeds"),
  totalBells: document.querySelector("#total-bells"),
  totalLetters: document.querySelector("#total-letters"),
  totalWeeds: document.querySelector("#total-weeds"),
  objective: document.querySelector("#objective"),
  overlay: document.querySelector("#overlay"),
  levelSelect: document.querySelector("#level-select"),
  levelSelectButtons: document.querySelectorAll(".level-select__button"),
  startButton: document.querySelector("#start-button"),
  retryButton: document.querySelector("#retry-button"),
  nextButton: document.querySelector("#next-button"),
  pauseButton: document.querySelector("#pause-button"),
  touchControls: document.querySelector("#touch-controls"),
};

const mobileInput = {
  left: false,
  right: false,
  jumpQueued: false,
  dashQueued: false,
};

const state = {
  started: false,
  selectedLevel: 1,
  paused: false,
  level: 1,
  lives: 3,
  bells: 0,
  letters: 0,
  weeds: 0,
  won: false,
  failed: false,
};

function getLevelData(level) {
  if (level === 3) {
    return {
      name: "狸貓商店街",
      objective: "頂開方塊找信件",
      fallFails: true,
      hasShopkeeper: true,
      groundSegments: [
        [0, 760],
        [950, 1500],
        [1700, 2250],
        [2450, WORLD_WIDTH],
      ],
      platforms: [
        [430, 372, 2],
        [820, 304, 2],
        [1220, 366, 2],
        [1580, 286, 2],
        [1970, 348, 3],
        [2380, 290, 2],
        [2760, 356, 2],
      ],
      bells: [
        [340, 418],
        [480, 322],
        [860, 252],
        [1280, 318],
        [1620, 238],
        [2020, 300],
        [2160, 300],
        [2420, 242],
        [2820, 308],
        [3020, 418],
      ],
      letters: [
        [700, 418],
      ],
      bumpBlocks: [
        [620, 330],
        [1120, 300],
        [1880, 286],
        [2580, 322],
      ],
      enemies: [
        [540, 430, 430, 700],
        [1320, 430, 1200, 1450],
        [2060, 296, 1980, 2220],
        [2870, 430, 2760, 3030],
      ],
      goalX: 3075,
    };
  }

  if (level === 2) {
    return {
      name: "坑洞郵路",
      objective: "跳過坑洞抵達終點",
      fallFails: true,
      groundSegments: [
        [0, 650],
        [820, 1280],
        [1500, 2050],
        [2290, WORLD_WIDTH],
      ],
      platforms: [
        [430, 362, 2],
        [880, 300, 2],
        [1325, 360, 2],
        [1710, 286, 3],
        [2140, 374, 1],
        [2440, 304, 2],
        [2820, 340, 2],
      ],
      bells: [
        [380, 316],
        [530, 316],
        [930, 250],
        [1160, 418],
        [1365, 312],
        [1750, 238],
        [1900, 238],
        [2480, 256],
        [2860, 292],
        [3000, 418],
      ],
      letters: [
        [930, 226],
        [1815, 230],
        [2880, 268],
      ],
      bumpBlocks: [],
      enemies: [
        [560, 430, 470, 620],
        [1110, 430, 940, 1220],
        [1840, 235, 1720, 1940],
        [2480, 252, 2410, 2570],
        [2920, 430, 2820, 3050],
      ],
      goalX: 3080,
    };
  }

  return {
    name: "村口小徑",
    objective: "抵達村口告示牌",
    fallFails: false,
    groundSegments: [[0, WORLD_WIDTH]],
    platforms: [
      [430, 386, 2],
      [760, 314, 2],
      [1080, 400, 2],
      [1380, 332, 3],
      [1760, 392, 2],
      [2050, 304, 2],
      [2360, 372, 3],
      [2780, 318, 2],
    ],
    bells: [
      [330, 415],
      [475, 336],
      [690, 405],
      [795, 264],
      [1040, 350],
      [1450, 282],
      [1588, 282],
      [1740, 340],
      [2090, 254],
      [2410, 322],
      [2475, 322],
      [2820, 268],
    ],
    letters: [
      [820, 240],
      [1515, 252],
      [2850, 258],
    ],
    bumpBlocks: [],
    enemies: [
      [600, 430, 520, 710],
      [1230, 430, 1120, 1330],
      [1900, 430, 1810, 2050],
      [2630, 430, 2520, 2740],
    ],
    goalX: 3070,
  };
}

class VillageScene extends Phaser.Scene {
  constructor() {
    super("VillageScene");
  }

  preload() {
    this.load.image("assistant", "assets/characters/village-assistant.png");
    this.load.image("shopkeeper", "assets/characters/tanuki-shopkeeper.png");
  }

  create() {
    this.levelData = getLevelData(state.level);
    this.isResetting = false;
    this.lastGroundedAt = 0;
    this.jumpBufferedUntil = 0;
    this.dashReadyAt = 0;
    this.dashAttackUntil = 0;
    this.dashDirection = 1;
    this.createTextures();
    this.createWorld();
    this.createPlayer();
    this.createCollectibles();
    this.createBumpBlocks();
    this.createEnemies();
    this.createGoal();
    this.createInput();
    this.setupCamera();
    this.updateHud();
    if (state.started && !state.paused && !state.failed && !state.won) this.physics.resume();
    else this.physics.pause();
  }

  createTextures() {
    const grass = this.make.graphics({ x: 0, y: 0, add: false });
    grass.fillStyle(0x58a45d, 1).fillRoundedRect(0, 0, 96, 32, 6);
    grass.fillStyle(0x34764a, 1).fillRect(0, 24, 96, 8);
    grass.generateTexture("grass-block", 96, 32);

    const dirt = this.make.graphics({ x: 0, y: 0, add: false });
    dirt.fillStyle(0x936c45, 1).fillRoundedRect(0, 0, 96, 52, 4);
    dirt.fillStyle(0x765435, 1);
    for (let i = 8; i < 92; i += 18) dirt.fillCircle(i, 20 + (i % 3) * 6, 3);
    dirt.generateTexture("dirt-block", 96, 52);

    const bell = this.make.graphics({ x: 0, y: 0, add: false });
    bell.fillStyle(0xf2c44a, 1).fillCircle(16, 17, 12);
    bell.fillStyle(0xffe389, 1).fillCircle(12, 12, 4);
    bell.lineStyle(3, 0xa96d1f, 1).strokeCircle(16, 17, 12);
    bell.fillStyle(0xa96d1f, 1).fillCircle(16, 29, 3);
    bell.generateTexture("bell", 32, 34);

    const letter = this.make.graphics({ x: 0, y: 0, add: false });
    letter.fillStyle(0xfffbef, 1).fillRoundedRect(0, 0, 38, 26, 4);
    letter.lineStyle(3, 0x45906c, 1).strokeRoundedRect(0, 0, 38, 26, 4);
    letter.lineStyle(2, 0x45906c, 1).lineBetween(3, 4, 19, 16).lineBetween(35, 4, 19, 16);
    letter.generateTexture("letter", 38, 26);

    const weed = this.make.graphics({ x: 0, y: 0, add: false });
    weed.fillStyle(0x3f8d43, 1).fillEllipse(22, 24, 34, 32);
    weed.fillStyle(0x2e6c32, 1).fillTriangle(8, 28, 18, 2, 26, 30);
    weed.fillTriangle(18, 30, 30, 4, 36, 29);
    weed.fillStyle(0xfff1d5, 1).fillCircle(15, 22, 3).fillCircle(29, 22, 3);
    weed.fillStyle(0x23302b, 1).fillCircle(15, 22, 1.5).fillCircle(29, 22, 1.5);
    weed.generateTexture("weed", 44, 42);

    const sign = this.make.graphics({ x: 0, y: 0, add: false });
    sign.fillStyle(0x7a5430, 1).fillRoundedRect(8, 0, 86, 52, 6);
    sign.fillStyle(0xf5dd9d, 1).fillRoundedRect(15, 8, 72, 34, 4);
    sign.fillStyle(0x5d3a22, 1).fillRect(45, 50, 12, 58);
    sign.generateTexture("notice-sign", 102, 108);

    const block = this.make.graphics({ x: 0, y: 0, add: false });
    block.fillStyle(0xf2b84b, 1).fillRoundedRect(0, 0, 44, 44, 5);
    block.lineStyle(3, 0x9d6722, 1).strokeRoundedRect(0, 0, 44, 44, 5);
    block.fillStyle(0x8f5b1d, 1).fillCircle(22, 16, 4).fillRect(20, 20, 4, 12).fillCircle(22, 36, 2);
    block.generateTexture("bump-block", 44, 44);

    const used = this.make.graphics({ x: 0, y: 0, add: false });
    used.fillStyle(0xb88b54, 1).fillRoundedRect(0, 0, 44, 44, 5);
    used.lineStyle(3, 0x795638, 1).strokeRoundedRect(0, 0, 44, 44, 5);
    used.fillStyle(0x8b6842, 1).fillRect(10, 20, 24, 5);
    used.generateTexture("used-block", 44, 44);
  }

  createWorld() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT + 120);
    this.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x87d7ee).setOrigin(0);
    this.add.rectangle(0, 360, WORLD_WIDTH, 180, 0xbbe7b2).setOrigin(0);

    this.levelData.groundSegments.slice(0, -1).forEach((segment, index) => {
      const next = this.levelData.groundSegments[index + 1];
      const pitX = segment[1];
      const pitWidth = next[0] - segment[1];
      if (pitWidth > 0) {
        this.add.rectangle(pitX, GROUND_Y + 10, pitWidth, 120, 0x36525b, 0.35).setOrigin(0);
        this.add.rectangle(pitX, GROUND_Y + 42, pitWidth, 80, 0x22363e, 0.42).setOrigin(0);
      }
    });

    for (let i = 0; i < 18; i += 1) {
      const cloud = this.add.ellipse(i * 210 + 80, 78 + (i % 3) * 32, 120, 34, 0xffffff, 0.55);
      cloud.setScrollFactor(0.22);
    }
    for (let i = 0; i < 10; i += 1) {
      this.add.triangle(i * 360 - 80, 388, 0, 130, 190, 130, 95, 10, 0x6eb97b, 0.9).setScrollFactor(0.45);
    }

    if (this.levelData.hasShopkeeper) {
      this.add.rectangle(2925, 392, 210, 126, 0x9b6b3d, 0.28).setOrigin(0.5, 1);
      this.add.image(2920, GROUND_Y - 92, "shopkeeper").setDisplaySize(104, 136).setDepth(1);
    }

    this.platforms = this.physics.add.staticGroup();
    this.levelData.groundSegments.forEach(([start, end]) => {
      for (let x = start; x < end; x += 96) {
        this.platforms.create(x + 48, GROUND_Y + 16, "grass-block");
        this.platforms.create(x + 48, GROUND_Y + 58, "dirt-block");
      }
    });
    this.levelData.platforms.forEach(([x, y, count]) => {
      for (let i = 0; i < count; i += 1) this.platforms.create(x + i * 96, y, "grass-block");
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(110, 360, "assistant");
    this.player.setDisplaySize(58, 82);
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(420, 760).setOffset(300, 250);
    this.player.setDragX(1050);
    this.player.setMaxVelocity(DASH_SPEED, 820);
    this.physics.add.collider(this.player, this.platforms);
  }

  createCollectibles() {
    this.bells = this.physics.add.staticGroup();
    this.levelData.bells.forEach(([x, y]) => {
      const bell = this.bells.create(x, y, "bell");
      bell.body.setSize(22, 24).setOffset(5, 5);
    });

    this.letters = this.physics.add.staticGroup();
    this.levelData.letters.forEach(([x, y]) => this.createLetter(x, y));

    this.physics.add.overlap(this.player, this.bells, (_player, bell) => {
      bell.disableBody(true, true);
      state.bells += 1;
      this.popSparkle(bell.x, bell.y);
      this.updateHud();
    });
    this.physics.add.overlap(this.player, this.letters, (_player, letter) => {
      letter.disableBody(true, true);
      state.letters += 1;
      this.popSparkle(letter.x, letter.y);
      this.updateHud();
    });
  }

  createLetter(x, y) {
    const letter = this.letters.create(x, y, "letter");
    letter.body.setSize(30, 20).setOffset(4, 3);
    return letter;
  }

  createBumpBlocks() {
    this.bumpBlocks = this.physics.add.staticGroup();
    this.levelData.bumpBlocks.forEach(([x, y]) => {
      const block = this.bumpBlocks.create(x, y, "bump-block");
      block.setData("used", false);
      block.body.setSize(44, 44);
    });
    this.physics.add.collider(this.player, this.bumpBlocks, this.hitBumpBlock, undefined, this);
  }

  hitBumpBlock(player, block) {
    if (block.getData("used")) return;
    const hitFromBelow = player.y > block.y + 18;
    if (!hitFromBelow) return;

    block.setData("used", true);
    block.setTexture("used-block");
    player.setVelocityY(120);
    this.createLetter(block.x, block.y - 54);
    this.popSparkle(block.x, block.y - 24);
    this.tweens.add({
      targets: block,
      y: block.y - 8,
      duration: 70,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  createEnemies() {
    this.enemies = this.physics.add.group();
    this.levelData.enemies.forEach(([x, y, left, right]) => {
      const enemy = this.enemies.create(x, y, "weed");
      enemy.setData("left", left);
      enemy.setData("right", right);
      enemy.setVelocityX(-75);
      enemy.setBounce(0);
    });
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, undefined, this);
  }

  createGoal() {
    this.goal = this.physics.add.staticSprite(this.levelData.goalX, GROUND_Y - 55, "notice-sign");
    this.physics.add.overlap(this.player, this.goal, () => this.finishLevel());
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(180, 110);
  }

  update() {
    if (!state.started || state.paused || state.won || state.failed) return;

    const now = this.time.now;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) this.lastGroundedAt = now;

    const left = this.cursors.left.isDown || this.keys.left.isDown || mobileInput.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || mobileInput.right;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      mobileInput.jumpQueued;
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash) || mobileInput.dashQueued;
    mobileInput.jumpQueued = false;
    mobileInput.dashQueued = false;

    if (jumpPressed) this.jumpBufferedUntil = now + 130;
    if (left && !right) {
      this.player.setAccelerationX(-704);
      this.player.setFlipX(true);
    } else if (right && !left) {
      this.player.setAccelerationX(704);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    if (this.jumpBufferedUntil > now && now - this.lastGroundedAt <= 115) {
      this.player.setVelocityY(-590);
      this.jumpBufferedUntil = 0;
      this.lastGroundedAt = 0;
    }

    if (dashPressed) this.performDash();
    if (now <= this.dashAttackUntil) this.clearDashTarget(118);
    if (now > this.dashAttackUntil && Math.abs(this.player.body.velocity.x) > NORMAL_MOVE_SPEED) {
      this.player.setVelocityX(Math.sign(this.player.body.velocity.x) * NORMAL_MOVE_SPEED);
    }

    this.player.setAngle(onGround ? 0 : Phaser.Math.Clamp(this.player.body.velocity.y / 50, -7, 9));
    this.updateEnemies();
    if (this.player.y > GAME_HEIGHT + 45) {
      if (this.levelData.fallFails) this.failRun("掉進坑洞", "這一關的坑洞會直接任務失敗，可以重試本關或從第一關開始。");
      else this.loseLife();
    }
  }

  performDash() {
    const now = this.time.now;
    if (now < this.dashReadyAt) return;
    const inputDirection = mobileInput.left ? -1 : mobileInput.right ? 1 : 0;
    this.dashDirection = inputDirection || (this.player.flipX ? -1 : 1);
    this.player.setFlipX(this.dashDirection < 0);
    this.player.setVelocityX(this.dashDirection * DASH_SPEED);
    this.dashReadyAt = now + 360;
    this.dashAttackUntil = now + 700;
    this.clearDashTarget(150);
    this.cameras.main.shake(90, 0.0024);
  }

  updateEnemies() {
    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) return;
      if (enemy.x < enemy.getData("left")) enemy.setVelocityX(75);
      if (enemy.x > enemy.getData("right")) enemy.setVelocityX(-75);
      enemy.setFlipX(enemy.body.velocity.x > 0);
    });
  }

  clearDashTarget(range) {
    const target = this.enemies.getChildren().find((enemy) => enemy.active && this.canDashHit(enemy, range));
    if (target) this.clearEnemy(target, "dash");
  }

  canDashHit(enemy, range) {
    const horizontalDistance = enemy.x - this.player.x;
    const inFront = this.dashDirection > 0 ? horizontalDistance >= -38 : horizontalDistance <= 38;
    return inFront && Math.abs(horizontalDistance) <= range && Math.abs(enemy.y - this.player.y) <= 86;
  }

  clearEnemy(enemy, method) {
    enemy.disableBody(true, true);
    state.weeds += 1;
    this.popSparkle(enemy.x, enemy.y);
    this.updateHud();
    if (method === "stomp") {
      this.player.setVelocityY(-360);
      return;
    }
    this.player.setVelocityX(-this.dashDirection * 110);
    this.player.setVelocityY(-150);
    this.dashAttackUntil = 0;
    this.cameras.main.shake(110, 0.004);
  }

  hitEnemy(player, enemy) {
    if (this.isResetting || !enemy.active) return;
    const fallingOntoEnemy = player.body.velocity.y > 120 && player.y < enemy.y - 8;
    if (fallingOntoEnemy) {
      this.clearEnemy(enemy, "stomp");
      return;
    }
    if (this.time.now <= this.dashAttackUntil || Math.abs(player.body.velocity.x) > 520) {
      this.dashDirection = player.body.velocity.x < 0 ? -1 : 1;
      this.clearEnemy(enemy, "dash");
      return;
    }
    this.loseLife();
  }

  loseLife() {
    if (this.isResetting || state.won || state.failed) return;
    this.isResetting = true;
    state.lives -= 1;
    this.updateHud();
    this.cameras.main.shake(180, 0.008);
    if (state.lives <= 0) {
      this.failRun("任務失敗", "從第一關開始，或在第二關、第三關重試本關。", true);
      return;
    }
    this.time.delayedCall(420, () => {
      this.player.setPosition(Math.max(110, this.player.x - 230), 320);
      this.player.setVelocity(0, 0);
      this.isResetting = false;
    });
  }

  failRun(title, copy, force = false) {
    if ((!force && this.isResetting) || state.won || state.failed) return;
    this.isResetting = true;
    state.failed = true;
    state.paused = false;
    state.lives = 0;
    resetMobileInput();
    this.player?.setAcceleration(0, 0);
    this.player?.setVelocity(0, 0);
    this.updateHud();
    this.physics.pause();
    this.endRun(title, copy, false, state.level > 1);
  }

  finishLevel() {
    if (state.won) return;
    state.won = true;
    this.physics.pause();
    const canContinue = state.level < MAX_LEVEL;
    const title = canContinue ? `第 ${state.level} 關完成` : "村務全部完成";
    const copy = `收集 ${state.bells}/${this.levelData.bells.length} 鈴鐺、${state.letters}/${this.getTotalLetters()} 封信件，清掉 ${state.weeds}/${this.levelData.enemies.length} 隻雜草怪。`;
    this.endRun(title, copy, canContinue, false);
  }

  endRun(title, copy, canContinue, canRetry) {
    hud.overlay.classList.remove("is-hidden");
    hud.levelSelect.classList.add("is-hidden");
    hud.touchControls.classList.remove("is-active");
    hud.overlay.querySelector("h1").textContent = title;
    hud.overlay.querySelector(".overlay__copy").textContent = copy;
    hud.startButton.textContent = "從第一關開始";
    hud.nextButton.classList.toggle("is-hidden", !canContinue);
    hud.retryButton.classList.toggle("is-hidden", !canRetry);
    hud.objective.textContent = title;
  }

  popSparkle(x, y) {
    const sparkle = this.add.circle(x, y, 9, 0xfff1a8, 0.85);
    this.tweens.add({
      targets: sparkle,
      alpha: 0,
      scale: 2.4,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => sparkle.destroy(),
    });
  }

  getTotalLetters() {
    return this.levelData.letters.length + this.levelData.bumpBlocks.length;
  }

  updateHud() {
    hud.level.textContent = state.level;
    hud.lives.textContent = state.lives;
    hud.bells.textContent = state.bells;
    hud.letters.textContent = state.letters;
    hud.weeds.textContent = state.weeds;
    hud.totalBells.textContent = this.levelData.bells.length;
    hud.totalLetters.textContent = this.getTotalLetters();
    hud.totalWeeds.textContent = this.levelData.enemies.length;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#87d7ee",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1180 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  scene: [VillageScene],
});

window.belltreeDebug = { game, state, mobileInput };

function resetMobileInput() {
  mobileInput.left = false;
  mobileInput.right = false;
  mobileInput.jumpQueued = false;
  mobileInput.dashQueued = false;
}

function startLevel(level) {
  const nextLevel = Phaser.Math.Clamp(level, 1, MAX_LEVEL);
  const data = getLevelData(nextLevel);
  state.started = true;
  state.selectedLevel = nextLevel;
  state.paused = false;
  state.level = nextLevel;
  state.lives = 3;
  state.bells = 0;
  state.letters = 0;
  state.weeds = 0;
  state.won = false;
  state.failed = false;
  resetMobileInput();
  hud.objective.textContent = data.objective;
  hud.pauseButton.textContent = "II";
  hud.nextButton.classList.add("is-hidden");
  hud.retryButton.classList.add("is-hidden");
  hud.levelSelect.classList.add("is-hidden");
  hud.touchControls.classList.add("is-active");
  hud.overlay.classList.add("is-hidden");
  game.scene.stop("VillageScene");
  game.scene.start("VillageScene");
  game.scene.getScene("VillageScene").physics.resume();
}

function selectLevel(level) {
  state.selectedLevel = Phaser.Math.Clamp(level, 1, MAX_LEVEL);
  if (!state.started) state.level = state.selectedLevel;
  hud.levelSelectButtons.forEach((button) => {
    const isSelected = Number(button.dataset.level) === state.selectedLevel;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  const data = getLevelData(state.selectedLevel);
  hud.level.textContent = state.selectedLevel;
  hud.totalBells.textContent = data.bells.length;
  hud.totalLetters.textContent = data.letters.length + data.bumpBlocks.length;
  hud.totalWeeds.textContent = data.enemies.length;
  hud.objective.textContent = data.objective;
}

function preventTouchMenu(event) {
  event.preventDefault();
}

function bindTouchButton(selector, handlers) {
  const button = document.querySelector(selector);
  const press = (event) => {
    event.preventDefault();
    try {
      button.setPointerCapture?.(event.pointerId);
    } catch {
      // Some automated/mobile browsers send touch-like events without active pointer capture.
    }
    handlers.down();
  };
  const release = (event) => {
    event.preventDefault();
    handlers.up?.();
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => handlers.up?.());
  button.addEventListener("contextmenu", preventTouchMenu);
  button.addEventListener("selectstart", preventTouchMenu);
  button.addEventListener("dragstart", preventTouchMenu);
}

hud.touchControls.addEventListener("contextmenu", preventTouchMenu);
hud.touchControls.addEventListener("selectstart", preventTouchMenu);
hud.touchControls.addEventListener("dragstart", preventTouchMenu);

bindTouchButton("#touch-left", {
  down: () => {
    mobileInput.left = true;
  },
  up: () => {
    mobileInput.left = false;
  },
});
bindTouchButton("#touch-right", {
  down: () => {
    mobileInput.right = true;
  },
  up: () => {
    mobileInput.right = false;
  },
});
bindTouchButton("#touch-jump", {
  down: () => {
    mobileInput.jumpQueued = true;
  },
});
bindTouchButton("#touch-dash", {
  down: () => {
    mobileInput.dashQueued = true;
    const scene = game.scene.getScene("VillageScene");
    if (state.started && !state.paused && !state.won && !state.failed && scene?.performDash) scene.performDash();
  },
});

hud.levelSelectButtons.forEach((button) => {
  button.addEventListener("click", () => selectLevel(Number(button.dataset.level)));
});

hud.startButton.addEventListener("click", () => startLevel(state.started ? 1 : state.selectedLevel));
hud.retryButton.addEventListener("click", () => startLevel(state.level));
hud.nextButton.addEventListener("click", () => startLevel(state.level + 1));
hud.pauseButton.addEventListener("click", () => {
  if (!state.started || state.won || state.failed) return;
  const scene = game.scene.getScene("VillageScene");
  state.paused = !state.paused;
  hud.pauseButton.textContent = state.paused ? ">" : "II";
  if (state.paused) {
    scene.physics.pause();
    resetMobileInput();
    hud.objective.textContent = "暫停中";
  } else {
    scene.physics.resume();
    hud.objective.textContent = getLevelData(state.level).objective;
  }
});
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") startLevel(1);
});
window.addEventListener("blur", resetMobileInput);
