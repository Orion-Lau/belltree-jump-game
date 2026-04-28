const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const WORLD_WIDTH = 3200;
const GROUND_Y = 486;

const hud = {
  lives: document.querySelector("#lives"),
  bells: document.querySelector("#bells"),
  letters: document.querySelector("#letters"),
  weeds: document.querySelector("#weeds"),
  objective: document.querySelector("#objective"),
  overlay: document.querySelector("#overlay"),
  startButton: document.querySelector("#start-button"),
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
  paused: false,
  lives: 3,
  bells: 0,
  letters: 0,
  weeds: 0,
  won: false,
};

class VillageScene extends Phaser.Scene {
  constructor() {
    super("VillageScene");
  }

  preload() {
    this.load.image("assistant", "assets/characters/village-assistant.png");
  }

  create() {
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
    this.createEnemies();
    this.createGoal();
    this.createInput();
    this.setupCamera();
    this.updateHud();
    this.physics.pause();
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
  }

  createWorld() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x87d7ee).setOrigin(0);
    this.add.rectangle(0, 360, WORLD_WIDTH, 180, 0xbbe7b2).setOrigin(0);

    for (let i = 0; i < 18; i += 1) {
      const x = i * 210 + 80;
      const cloud = this.add.ellipse(x, 78 + (i % 3) * 32, 120, 34, 0xffffff, 0.55);
      cloud.setScrollFactor(0.22);
    }

    for (let i = 0; i < 10; i += 1) {
      const x = i * 360 - 80;
      this.add.triangle(x, 388, 0, 130, 190, 130, 95, 10, 0x6eb97b, 0.9).setScrollFactor(0.45);
    }

    this.platforms = this.physics.add.staticGroup();
    for (let x = 0; x < WORLD_WIDTH; x += 96) {
      this.platforms.create(x + 48, GROUND_Y + 16, "grass-block");
      this.platforms.create(x + 48, GROUND_Y + 58, "dirt-block");
    }

    [
      [430, 386, 2],
      [760, 314, 2],
      [1080, 400, 2],
      [1380, 332, 3],
      [1760, 392, 2],
      [2050, 304, 2],
      [2360, 372, 3],
      [2780, 318, 2],
    ].forEach(([x, y, count]) => {
      for (let i = 0; i < count; i += 1) this.platforms.create(x + i * 96, y, "grass-block");
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(110, 360, "assistant");
    this.player.setDisplaySize(58, 82);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(420, 760).setOffset(300, 250);
    this.player.setDragX(1050);
    this.player.setMaxVelocity(300, 760);
    this.physics.add.collider(this.player, this.platforms);
  }

  createCollectibles() {
    this.bells = this.physics.add.staticGroup();
    [
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
    ].forEach(([x, y]) => {
      const bell = this.bells.create(x, y, "bell");
      bell.body.setSize(22, 24).setOffset(5, 5);
    });

    this.letters = this.physics.add.staticGroup();
    [
      [820, 240],
      [1515, 252],
      [2850, 258],
    ].forEach(([x, y]) => this.letters.create(x, y, "letter"));

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

  createEnemies() {
    this.enemies = this.physics.add.group();
    [
      [600, 430, 520, 710],
      [1230, 430, 1120, 1330],
      [1900, 430, 1810, 2050],
      [2630, 430, 2520, 2740],
    ].forEach(([x, y, left, right]) => {
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
    this.goal = this.physics.add.staticSprite(3070, GROUND_Y - 55, "notice-sign");
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
    if (!state.started || state.paused || state.won) return;

    const now = this.time.now;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) this.lastGroundedAt = now;

    const left = this.cursors.left.isDown || this.keys.left.isDown || mobileInput.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || mobileInput.right;
    const keyboardJump = Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.jump);
    const keyboardDash = Phaser.Input.Keyboard.JustDown(this.keys.dash);
    const jumpPressed = keyboardJump || mobileInput.jumpQueued;
    const dashPressed = keyboardDash || mobileInput.dashQueued;

    mobileInput.jumpQueued = false;
    mobileInput.dashQueued = false;

    if (jumpPressed) this.jumpBufferedUntil = now + 130;

    if (left && !right) {
      this.player.setAccelerationX(-980);
      this.player.setFlipX(true);
    } else if (right && !left) {
      this.player.setAccelerationX(980);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    const canUseCoyoteJump = now - this.lastGroundedAt <= 115;
    if (this.jumpBufferedUntil > now && canUseCoyoteJump) {
      this.player.setVelocityY(-590);
      this.jumpBufferedUntil = 0;
      this.lastGroundedAt = 0;
    }

    if (dashPressed && now >= this.dashReadyAt) {
      this.dashDirection = this.player.flipX ? -1 : 1;
      this.player.setVelocityX(this.dashDirection * 620);
      this.dashReadyAt = now + 420;
      this.dashAttackUntil = now + 520;
      this.clearDashTarget();
      this.cameras.main.shake(70, 0.0018);
    }

    this.player.setAngle(onGround ? 0 : Phaser.Math.Clamp(this.player.body.velocity.y / 50, -7, 9));
    this.updateEnemies();

    if (this.player.y > GAME_HEIGHT + 60) this.loseLife();
  }

  updateEnemies() {
    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) return;
      if (enemy.x < enemy.getData("left")) enemy.setVelocityX(75);
      if (enemy.x > enemy.getData("right")) enemy.setVelocityX(-75);
      enemy.setFlipX(enemy.body.velocity.x > 0);
    });
  }

  clearDashTarget() {
    const target = this.enemies.getChildren().find((enemy) => enemy.active && this.canDashHit(enemy));
    if (target) this.clearEnemy(target, "dash");
  }

  canDashHit(enemy) {
    const horizontalDistance = enemy.x - this.player.x;
    const inFront = this.dashDirection > 0 ? horizontalDistance >= -20 : horizontalDistance <= 20;
    const closeEnough = Math.abs(horizontalDistance) <= 92;
    const verticallyAligned = Math.abs(enemy.y - this.player.y) <= 72;
    return inFront && closeEnough && verticallyAligned;
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

    this.player.setVelocityX(-this.dashDirection * 150);
    this.player.setVelocityY(-170);
    this.dashAttackUntil = 0;
    this.cameras.main.shake(90, 0.003);
  }

  hitEnemy(player, enemy) {
    if (this.isResetting || !enemy.active) return;

    const dashingIntoEnemy = this.time.now <= this.dashAttackUntil || Math.abs(player.body.velocity.x) > 360;
    const fallingOntoEnemy = player.body.velocity.y > 120 && player.y < enemy.y - 8;
    if (fallingOntoEnemy) {
      this.clearEnemy(enemy, "stomp");
      return;
    }

    if (dashingIntoEnemy) {
      this.dashDirection = player.body.velocity.x < 0 ? -1 : 1;
      this.clearEnemy(enemy, "dash");
      return;
    }

    this.loseLife();
  }

  loseLife() {
    if (this.isResetting || state.won) return;
    this.isResetting = true;
    state.lives -= 1;
    this.updateHud();
    this.cameras.main.shake(180, 0.008);

    if (state.lives <= 0) {
      this.endRun("任務失敗", "按 R 或點擊按鈕重新開始。");
      return;
    }

    this.time.delayedCall(420, () => {
      this.player.setPosition(Math.max(110, this.player.x - 230), 320);
      this.player.setVelocity(0, 0);
      this.isResetting = false;
    });
  }

  finishLevel() {
    if (state.won) return;
    state.won = true;
    this.physics.pause();
    this.endRun("村務完成", `收集 ${state.bells}/12 鈴鐺、${state.letters}/3 封信件，清掉 ${state.weeds}/4 隻雜草怪。`);
  }

  endRun(title, copy) {
    hud.overlay.classList.remove("is-hidden");
    hud.touchControls.classList.remove("is-active");
    hud.overlay.querySelector("h1").textContent = title;
    hud.overlay.querySelector(".overlay__copy").textContent = copy;
    hud.startButton.textContent = "重新開始";
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

  updateHud() {
    hud.lives.textContent = state.lives;
    hud.bells.textContent = state.bells;
    hud.letters.textContent = state.letters;
    hud.weeds.textContent = state.weeds;
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

function resetState() {
  state.started = true;
  state.paused = false;
  state.lives = 3;
  state.bells = 0;
  state.letters = 0;
  state.weeds = 0;
  state.won = false;
  resetMobileInput();
  hud.objective.textContent = "抵達村口告示牌";
  hud.pauseButton.textContent = "II";
  hud.touchControls.classList.add("is-active");
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
  },
});

hud.startButton.addEventListener("click", () => {
  resetState();
  hud.overlay.classList.add("is-hidden");
  game.scene.stop("VillageScene");
  game.scene.start("VillageScene");
  game.scene.getScene("VillageScene").physics.resume();
});

hud.pauseButton.addEventListener("click", () => {
  if (!state.started || state.won) return;
  const scene = game.scene.getScene("VillageScene");
  state.paused = !state.paused;
  hud.pauseButton.textContent = state.paused ? ">" : "II";
  if (state.paused) {
    scene.physics.pause();
    resetMobileInput();
    hud.objective.textContent = "暫停中";
  } else {
    scene.physics.resume();
    hud.objective.textContent = "抵達村口告示牌";
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") hud.startButton.click();
});

window.addEventListener("blur", resetMobileInput);
