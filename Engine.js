// SECTION Classes ---------------------------------------------
class PhysicsBodyType {
  type = "box";
  width = 1;
  height = 1;
  radius = 1;
  static = false;
}

class GameObject {
  //the base class for every object that will be contained by scenes in the game, the building block of the engine
  /**
   * @param {string} name
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} width
   * @param {number} height
   * @param {number} rotation
   * @param {number} scaleX
   * @param {number} scaleY
   */
  constructor(name, x, y, z, width, height, rotation, scaleX, scaleY) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = z;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  name;
  x;
  y;
  z;
  width;
  height;
  rotation;
  scaleX;
  scaleY;
  sImage;
  visible = true;
  body;
  bodyOffset = { x: 0, y: 0 };
  matchPhysics = false;

  // Methods
  Start = () => {}; //will be overridden by derivative classes, gets called once every time the InitScene() function is called

  Update = (delta) => {}; //will be overridden by derivative classes, gets called by the engine at every tick
  PhysicsUpdate = () => {}; //will be overridden by derivative classes, gets called by the physics engine at every tick, after the Update() function

  OnTouchDown = () => {}; //will be overridden by derivative classes, gets called by the engine ONCE when a touch is within the boundaries of the GameObject
  OnTouch = () => {}; //will be overridden by derivative classes, gets called by the engine when a touch is within the boundaries of the GameObject
  OnTouchUp = () => {}; //will be overridden by derivative classes, gets called by the engine ONCE when a touch is within the boundaries of the GameObject

  OnCollision = (collider) => {}; //gets called by the engine whenever this object is colliding with another one, in the CollisionDetection() function

  SetSprite = (name, resize = false) => {
    this.sImage = engine.spritesManager.GetSprite(name);
    if (resize) {
      this.width = this.sImage.width;
      this.height = this.sImage.height;
    }
  };

  SetRigidBody = (bodyType) => {
    // handle physics with matter.js

    // get width and height or radius
    let width = bodyType.width == "auto" ? this.width : bodyType.width;
    let height = bodyType.height == "auto" ? this.height : bodyType.height;
    let radius =
      bodyType.radius == "auto"
        ? Math.max(this.width, this.height) / 2
        : bodyType.radius;
    // apply scaling
    width *= this.scaleX;
    height *= this.scaleY;
    radius *= Math.max(this.scaleX, this.scaleY);
    // center x and y
    let x = this.x + width / 2;
    let y = this.y + height / 2;
    if (bodyType.type == "circle") {
      x = this.x + radius;
      y = this.y + radius;
    }
    // process body type
    switch (bodyType.type) {
      case "box":
        this.body = Matter.Bodies.rectangle(x, y, width, height, {
          isStatic: bodyType.static,
        });
        this.body.width = width;
        this.body.height = height;
        break;
      case "circle":
        this.body = Matter.Bodies.circle(x, y, radius, {
          isStatic: bodyType.static,
        });
        this.body.radius = radius;
        break;
      default:
        this.body = null;
        break;
    }
    // rotate body to match rotation
    let rotationRad = (this.rotation * Math.PI) / 180;
    Matter.Body.setAngle(this.body, rotationRad);
    // set body offset for later rendering
    this.bodyOffset = {
      x: this.body.radius ? radius * 2 : width,
      y: this.body.radius ? radius * 2 : height,
    };
  };

  Render = () => {
    //gets called every tick by the engine, just before the particle systems are rendered
    if (this.sImage != null && this.visible) {
      engine._drawImageExt(
        this.sImage,
        this.x,
        this.y,
        this.width,
        this.height,
        this.rotation,
        this.scaleX,
        this.scaleY,
        this.bodyOffset
      );
    }
  };

  RenderGUI = (delta) => {}; //will be overridden by derivative classes, gets called last during the rendering routine in the engine

  //the following getters are self-explanatory
  SetPos = (newX, newY) => {
    this.x = newX;
    this.y = newY;
  };

  SetRotationRad = (newRotation) => {
    if (this.body != null) {
      Matter.Body.setAngle(this.body, newRotation);
    }
  };

  SetRotationDeg = (newRotation) => {
    if (this.body != null) {
      let rotationRad = (newRotation * Math.PI) / 180;
      Matter.Body.setAngle(this.body, rotationRad);
    }
  };

  GetPos = () => {
    return {
      x: this.x,
      y: this.y,
    };
  };

  GetSize = () => {
    return {
      width: this.width,
      height: this.height,
    };
  };

  GetForwardVector = (adjustUp = false) => {
    let rotation = this.rotation;
    let forwardVector = {
      x: 1,
      y: 0,
    };
    if (adjustUp) {
      forwardVector = {
        x: 0,
        y: -1,
      };
    }
    let rotationRad = (rotation * Math.PI) / 180;
    // check that angle is not flipped
    forwardVector = Matter.Vector.rotate(forwardVector, rotationRad);
    forwardVector = Matter.Vector.normalise(forwardVector);
    forwardVector.x = parseFloat(forwardVector.x.toFixed(3));
    forwardVector.y = parseFloat(forwardVector.y.toFixed(3));
    return forwardVector;
  };

  GetVelocity = () => {
    if (this.body != null) return this.body.velocity;
    else
      return {
        x: 0,
        y: 0,
      };
  };

  AddForce = ({ x, y }) => {
    if (this.body != null)
      Matter.Body.applyForce(
        this.body,
        this.body.position,
        new Matter.Vector.create(x, y)
      );
  };

  AddTorque = (torque) => {
    if (this.body != null) this.body.torque = torque;
  };
}

class ParticleSystem {
  // Create an array for the particles
  particles = [];

  createParticleArray = (
    xPos,
    yPos,
    theCanvasContext,
    spd,
    rad,
    partNumber
  ) => {
    // Adds particles to the array
    for (var i = 0; i < partNumber; i++) {
      this.particles.push(new create(xPos, yPos, spd, rad));
    }
    this._renderParticles(theCanvasContext);
  };

  create = (startX, startY, speed, radius) => {
    // Point of touch
    this.x = startX;
    this.y = startY;

    // Add random velocity to each particle
    this.vx = RandomRange(-speed, speed);
    this.vy = RandomRange(-speed, speed);

    //Random shade of red will do for the explosion
    var red = Math.round(RandomRange(0, 255));
    var green = 0;
    var blue = 0;
    this.color = "rgba(" + red + ", " + green + ", " + blue + ", 0.5)";

    //Random size
    this.radius = RandomRange(radius, radius * 1.5);

    // fade value
    this.fade = RandomRange(0, 500);

    // particle dead
    this.dead = false;
  };

  // Render and move the particle
  _renderParticles = (theCanvasContext) => {
    if (this.particles.length <= 0) return;

    var aCanvasContext = theCanvasContext;
    aCanvasContext.globalCompositeOperation = "source-over";
    // Reduce the opacity of the BG paint
    aCanvasContext.fillStyle = "rgba(0, 0, 0, 0.3)";
    // Blend the particle with the background
    aCanvasContext.globalCompositeOperation = "lighter";

    // Render the particles
    for (var t = 0; t < this.particles.length; t++) {
      var p = this.particles[t];

      aCanvasContext.beginPath();

      // Mix the colours
      var gradient = aCanvasContext.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.radius
      );
      gradient.addColorStop(0, "white");
      gradient.addColorStop(0.4, "white");
      gradient.addColorStop(0.4, p.color);
      gradient.addColorStop(1, "black");

      aCanvasContext.fillStyle = gradient;
      aCanvasContext.arc(p.x, p.y, p.radius, Math.PI * 2, false);
      aCanvasContext.fill();

      // Add velocity
      p.x += p.vx;
      p.y += p.vy;

      // Decrease fade and if particle is dead remove it
      p.fade -= 10;

      if (p.fade < 0) {
        p.dead = true;
      }

      if (p.dead == true) {
        this.particles.splice(t, 1);
      }
    }

    // Restore the opacity of the BG
    aCanvasContext.fillStyle = "rgba(0, 0, 0, 1)";
    aCanvasContext.globalCompositeOperation = "source-over";
  };

  //Random Range function from: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
  RandomRange = (min, max) => {
    return Math.random() * (max - min) + min;
  };
}

class SpritesManager {
  //the sprites manager takes care of loading, storing and drawing sprites, it is explained in more detail in the blog and wiki
  sprites = [];

  async LoadSprite(name, path) {
    let p = new Promise((resolve, reject) => {
      let sprite = new Image();
      sprite.src = path;

      sprite.onload = () => {
        this.sprites.push({ name, sprite });
        resolve();
      };
    });

    return p;
  }

  GetSprite(name) {
    for (let i = 0; i < this.sprites.length; i++) {
      if (this.sprites[i].name == name) {
        return this.sprites[i].sprite;
      }
    }
  }
}

class AudioManager {
  //the audio manager takes care of loading, storing, playing and stopping sounds, it is explained in more detail in the blog and wiki
  clips = [];

  LoadAudio(name, path) {
    let audioClip = new Audio();
    audioClip.src = path;
    this.clips.push({ clip: audioClip, name: name });
  }

  PlayAudio(name, looping) {
    for (let i = 0; i < this.clips.length; i++) {
      if (this.clips[i].name == name) {
        this.clips[i].loop = looping;
        this.clips[i].play();
      }
    }
  }

  StopAudio = (name) => {
    for (let i = 0; i < this.clips.length; i++) {
      if (this.clips[i].name == name) {
        this.clips[i].clip.pause();
        this.clips[i].clip.currentTime = 0;
      }
    }
  };

  StopAllAudio() {
    for (let i = 0; i < this.clips.length; i++) {
      {
        this.clips[i].clip.pause();
        this.clips[i].clip.currentTime = 0;
      }
    }
  }
}

class InputManager {
  canvas;
  lastPt = null;
  activeScene;
  touching = false;
  lastEvent = null;
  scaleFillNative;

  GetMousePosition = () => {
    return this.lastPt;
  };

  init = (canvas) => {
    this.canvas = canvas;
    //Set Event Listeners for mobile
    this.canvas.addEventListener("touchstart", this.touchDown, false);
    this.canvas.addEventListener("touchmove", this.UpdateTouchEvent, false);
    this.canvas.addEventListener("touchend", this.touchUp, false);
    // for mouse
    this.canvas.addEventListener("mousedown", this.touchDown, false);
    this.canvas.addEventListener("mousemove", this.UpdateTouchEvent, false);
    this.canvas.addEventListener("mouseup", this.touchUp, false);

    this.canvas.addEventListener("touchcancel", this.touchUp, false);
  };

  UpdateTouchEvent = (evt) => {
    this.lastEvent = evt;
  };

  touchUp = (evt) => {
    evt.preventDefault();
    this.touching = false;

    this._checkClick("OnTouchUp");

    // aabb check for buttons
    this.activeScene.buttons.forEach((button) => {
      if (
        this.lastPt.x > button.x &&
        this.lastPt.x < button.x + button.width &&
        this.lastPt.y > button.y &&
        this.lastPt.y < button.y + button.height
      ) {
        button.callback();
      }
    });

    // Terminate touch path
    this.lastPt = null;
    return this.lastPt;
  };

  getMoouseCoordsAfterTransform = (evt) => {
    let mouseX = evt.touches?.length
      ? evt.touches[0].pageX
      : evt.pageX || evt.clientX;
    let mouseY = evt.touches?.length
      ? evt.touches[0].pageY
      : evt.pageY || evt.clientY;
    let mouseToWorld = engine.ViewportToWorld(mouseX, mouseY);
    return { x: mouseToWorld.x, y: mouseToWorld.y };
  };

  touchDown = (evt) => {
    evt.preventDefault();
    //joke to be made about american football is unfortunately missing
    // account for canvas translation
    let mousePos = this.getMoouseCoordsAfterTransform(evt);
    this.lastPt = { x: mousePos.x, y: mousePos.y };
    // this.lastPt = { x: evt.touches[0].pageX, y: evt.touches[0].pageY };
    this.touching = true;
    this.lastEvent = evt;

    //we also check if we clicked on an object
    this._checkClick("OnTouchDown");
    return this.lastPt;
  };

  OnTouch = () => {
    //other than setting up our last touched position
    if (!this.lastEvent) return false;
    if (!this.touching || this.lastEvent.touches?.length == 0) return false;
    // account for canvas translation
    let mousePos = this.getMoouseCoordsAfterTransform(this.lastEvent);
    this.lastPt = { x: mousePos.x, y: mousePos.y };
    // this.lastPt = {
    //   x: this.lastEvent.touches[0].pageX,
    //   y: this.lastEvent.touches[0].pageY,
    // };

    //we also check if we clicked on an object
    this._checkClick("OnTouch");
    return this.lastPt;
  };

  _checkClick = (method) => {
    //check we clicked on an object
    for (var i = 0; i < this.activeScene.objects.length; i++) {
      let obj = this.activeScene.objects[i];
      let size = obj.GetSize();

      if (
        this.lastPt.x > obj.x - size.width / 2 &&
        this.lastPt.y > obj.y - size.height / 2 &&
        this.lastPt.x < obj.x + size.width / 2 &&
        this.lastPt.y < obj.y + size.height / 2
      )
        obj[method]();
    }
  };
}

class SceneManager {
  //the scene manager is responsible for loading, unloading and switching scenes, it is explained in more detail in the blog and wiki

  scenes = [];
  activeScene = null;

  AddScene = (name) => {
    let scene = new Scene(name);
    this.scenes.push(scene);
    return scene;
  };

  GetScene = (name) => {
    return this.scenes.find((x) => x.name == name);
  };

  LoadScene = (sceneName) => {
    // clear the current scene
    this.activeScene?.Clear();
    // load the new scene
    let sceneToLoad = this.scenes.find((x) => x.name == sceneName);
    this.activeScene = sceneToLoad;
    engine.inputManager.activeScene = sceneToLoad;

    engine.camera = new Camera();
    engine.camera.SetPosition(
      engine.canvas.width / 2,
      engine.canvas.height / 2
    );

    console.log("Init Scene", this.activeScene.objects);
    this.activeScene.objects.forEach(function (object) {
      object?.Start();
    });
  };

  UpdateScene = (delta) => {
    this.activeScene.objects.forEach(function (object) {
      // first we call Update
      object?.Update(delta);
      // then we process physics
      if (object.body != null && object.matchPhysics) {
        object.x = object.body.position.x;
        object.y = object.body.position.y;
        // always switch between deg and rad
        let bodyAngleDeg = (object.body.angle * 180) / Math.PI;
        object.rotation = bodyAngleDeg;
      }
    });
  };

  RenderScene = (delta) => {
    this.activeScene.objects.forEach(function (object) {
      object?.Render(delta);
    });
  };

  RenderGUI = (delta) => {
    this.activeScene.objects.forEach(function (object) {
      object?.RenderGUI(delta);
    });
  };
}

class Scene {
  constructor(name) {
    this.name = name;
    this.objects = [];
  }
  name;
  objects = [];
  buttons = [];

  Start = () => {
    this.objects.forEach((object) => {
      object?.Start();
    });
  };

  Add = (object) => {
    this.objects.push(object);
    if (object.body != null) {
      Matter.World.add(engine.physicsEngine.world, object.body);
    }
  };

  Instantiate = (
    object,
    x = 0,
    y = 0,
    rotation = 0,
    scaleX = 1,
    scaleY = 1
  ) => {
    object.x = x;
    object.y = y;
    object.rotation = rotation;
    object.scaleX = scaleX;
    object.scaleY = scaleY;
    this.objects.push(object);
    if (object.body != null) {
      Matter.World.add(engine.physicsEngine.world, object.body);
    }
    object.Start();
  };

  Destroy = (object) => {
    let index = this.objects.indexOf(object);
    this.objects.splice(index, 1);
    if (object.body != null) {
      Matter.World.remove(engine.physicsEngine.world, object.body);
    }
  };

  Find = (name) => {
    for (let i = 0; i < this.objects.length; i++) {
      if (this.objects[i].name == name) return this.objects[i];
    }
  };

  Clear = () => {
    for (let i = 0; i < this.objects.length; i++) {
      let obj = this.objects[i];
      if (obj.body != null) {
        Matter.World.remove(engine.physicsEngine.world, obj.body);
      }
      this.Destroy(obj);
    }
    // remove all buttons
    this.buttons = [];
  };

  AddButton = (
    name,
    text,
    x,
    y,
    width,
    height,
    color = "#fff",
    borderRadius = 0,
    align = "center",
    callback
  ) => {
    this.buttons.push({
      name,
      text,
      x,
      y,
      width,
      height,
      color,
      borderRadius,
      align,
      callback,
    });
  };

  RemoveButton = (name) => {
    this.buttons = this.buttons.filter((button) => button.name != name);
  };
}

class LevelManager {
  //the level manager is responsible for loading, unloading and switching levels
  levels = [];

  LoadLevel = async (name, path) => {
    let level = new Level(name, path);
    let lvl = await level.LoadLevel();
    this.levels.push(lvl);
    return lvl;
  };
}

class Level {
  //the level class is a simple container for the level data
  constructor(name, path) {
    this.name = name;
    this.path = path;
  }

  LoadLevel = async () => {
    let p = new Promise((resolve, reject) => {
      require([this.path], () => {
        let levelData = getLevel().gameObjects;
        processLevel(levelData);
      });

      // process the level data asynchronously
      const processLevel = async (levelData) => {
        let objects = [];
        let images = [];
        for (let object of levelData) {
          let img = object.imageB64;
          if (img) {
            if (!images.find((x) => x == img)) {
              images.push(img);
              await engine.spritesManager.LoadSprite(
                object.imageName,
                object.imageB64
              );
            }
          }
          objects.push({
            x: object.x,
            y: object.y,
            z: object?.z || 0,
            scaleX: object?.scaleX || 1,
            scaleY: object?.scaleY || 1,
            rotation: object?.rotation || 0,
            name: object.name,
            imageName: object?.imageName || null,
            physics: object?.physics || false,
            physicsType: object?.physicsType || "box",
            static: object?.static || false,
            matchPhysics: object?.matchPhysics || false,
          });
        }
        this.levelData = objects;
        resolve(this.levelData);
      };
    });

    return p;
  };

  name;
  path;
  levelData;
}

class Camera {
  // possibles axis to move the camera
  AXIS = {
    NONE: 1,
    HORIZONTAL: 2,
    VERTICAL: 3,
    BOTH: 4,
  };

  x = 0;
  y = 0;
  zoom = 1;
  rotation = 0;

  // gameObject needs to have "x" and "y" properties (as world(or room) position)
  SetPosition = (x, y) => {
    let zoomedX = x * this.zoom;
    let zoomedY = y * this.zoom;
    this.x = zoomedX;
    this.y = zoomedY;
  };

  SetRotationDeg = (degrees) => {
    this.rotation = (degrees * Math.PI) / 180;
  };

  SetRotationRad = (radians) => {
    this.rotation = radians;
  };

  SetZoom = (zoom) => {
    this.zoom = zoom;
  };

  Update = () => {
    let originX = -(this.x - engine.canvas.width / 2);
    let originY = -(this.y - engine.canvas.height / 2);
    let ctx = engine.canvasContext;
    // we align with 0, 0 and rotate around the center of the canvas
    ctx.translate(engine.canvas.width / 2, engine.canvas.height / 2);
    ctx.rotate(-this.rotation);
    ctx.translate(-engine.canvas.width / 2, -engine.canvas.height / 2);
    // now we can translate and scale
    ctx.translate(originX, originY);
    ctx.scale(this.zoom, this.zoom);
  };
}

// SECTION Game Engine ---------------------------------------------

class Engine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.canvasContext = this.canvas.getContext("2d");

    if (this.canvas.getContext) {
      //Set Event Listeners for window, mouse and touch
      window.addEventListener("resize", this._resizeCanvas, false);
      window.addEventListener("orientationchange", this._resizeCanvas, false);
    }
    this._resizeCanvas();

    this.levelManager = new LevelManager(this);
    this.sceneManager = new SceneManager(this);
    this.particleManager = new ParticleSystem();
    this.spritesManager = new SpritesManager();
    this.audioManager = new AudioManager();
    this.inputManager = new InputManager(this);
    this.physicsEngine = Matter.Engine.create();
  }

  classes = [];

  // context
  canvas;
  center = { x: 0, y: 0 };
  canvasContext;
  startTimeMS;
  deltaTime;

  // managers
  sceneManager;
  particleManager;
  audioManager;
  inputManager;

  // physics
  debugPhysics = false;
  physicsEngine;
  physicsRunner;

  // direct drawing
  camera;
  lines = [];
  texts = [];
  circles = [];
  emptyCircles = [];
  rectangles = [];

  // Core methods

  Run = (startingScene) => {
    this._start(startingScene);
  };

  RegisterClass = (name, gameObjectClass) => {
    this.classes.push({ name, gameObjectClass });
  };

  UnregisterClass = (name) => {
    this.classes = this.classes.filter((x) => x.name != name);
  };

  GetRegisteredClass = (name) => {
    return this.classes.find((x) => x.name == name);
  };

  // Maths utils

  GetScreenCenter = () => {
    let center = this.ViewportToWorld(0, 0);
    return center;
  };

  ViewportToWorld = (x, y) => {
    // account for canvas translation and rotation
    let worldX = x + this.camera.x - this.canvas.width / 2;
    let worldY = y + this.camera.y - this.canvas.height / 2;

    // account for camera zoom
    worldX /= this.camera.zoom;
    worldY /= this.camera.zoom;

    return { x: worldX, y: worldY };
  };

  RadToDeg = (rad) => {
    return (rad * 180) / Math.PI;
  };

  DegToRad = (deg) => {
    return (deg * Math.PI) / 180;
  };

  AngleDeg = (p1, p2) => {
    // from: https://gist.github.com/conorbuck/2606166
    const angle = (anchor, point) =>
      (Math.atan2(anchor.y - point.y, anchor.x - point.x) * 180) / Math.PI +
      180;
    return angle(p1, p2);
  };

  Lerp = (a, b, alpha) => {
    return a + alpha * (b - a);
  };

  Remap = (value, low1, high1, low2, high2) => {
    return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
  };

  Clamp = (val, min, max) => {
    return Math.min(Math.max(val, min), max) || min;
  };

  Distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Drawing utils

  DrawLine = (x1, y1, x2, y2, color = "#fff", width = 1) => {
    this.lines.push({ x1, y1, x2, y2, color, width });
  };

  StyleText = (txtColour, txtFont, txtAlign, txtBaseline) => {
    //utility function to style text in a single call
    this.canvasContext.fillStyle = txtColour;
    this.canvasContext.font = txtFont;
    this.canvasContext.textAlign = txtAlign;
    this.canvasContext.textBaseline = txtBaseline;
  };

  DrawText = (txt, x, y, txtColour, txtSize, align = "left") => {
    this.texts.push({ txt, x, y, txtColour, txtSize, align });
  };

  DrawCircle = (x, y, radius, color = "#fff") => {
    this.circles.push({ x, y, radius, color });
  };

  DrawCircleEmpty = (x, y, radius, color = "#fff", width = 1) => {
    this.emptyCircles.push({ x, y, radius, color, width });
  };

  DrawRect = (x, y, width, height, color = "#fff", borderRadius = 0) => {
    this.rectangles.push({ x, y, width, height, color, borderRadius });
  };

  // internal utilities

  _start = (startingScene) => {
    this.startTimeMS = Date.now();

    this.inputManager.init(this.canvas);

    this.sceneManager.LoadScene(startingScene);

    this.physicsRunner = Matter.Runner.create();
    Matter.Runner.run(this.physicsRunner, this.physicsEngine);
    Matter.Events.on(this.physicsEngine, "beforeUpdate", this._updatePhysics);
    Matter.Events.on(
      this.physicsEngine,
      "collisionEnd",
      this._collisionPhysics
    );

    this._gameLoop();
  };

  _gameLoop = () => {
    this.deltaTime = (Date.now() - this.startTimeMS) / 1000;

    if (this.inputManager.touching) this.inputManager.OnTouch();

    this.sceneManager.UpdateScene(this.deltaTime);
    this._collisionDetection();
    this._render(this.deltaTime);

    this.startTimeMS = Date.now();
    requestAnimationFrame(this._gameLoop);
  };

  _updatePhysics = () => {
    this.sceneManager.activeScene.objects.forEach(function (object) {
      object?.PhysicsUpdate();
    });
  };

  _collisionPhysics = (event) => {
    if (event.pairs.length > 0) {
      event.pairs.forEach((pair) => {
        let bodyA = pair.bodyA;
        let bodyB = pair.bodyB;
        let gameObjectA = null;
        let gameObjectB = null;
        this.sceneManager.activeScene.objects.forEach((object) => {
          if (object.body == bodyA) gameObjectA = object;
          if (object.body == bodyB) gameObjectB = object;
        });

        if (gameObjectA != null) gameObjectA.OnCollision(gameObjectB);
        if (gameObjectB != null) gameObjectB.OnCollision(gameObjectA);
      });
    }
  };

  _render = (delta) => {
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.canvasContext.save();

    // render camera viewport
    this.camera.Update();

    //render all GameObjects
    this.sceneManager.RenderScene(delta);

    // debug physics
    if (this.debugPhysics) this._debugRenderPhysics();

    //render particle systems on top
    this.particleManager._renderParticles(this.canvasContext);

    //render GUI
    this.sceneManager.RenderGUI(delta);

    // render all texts
    this.texts.forEach((text) => {
      this._drawText(
        text.txt,
        text.x,
        text.y,
        text.txtColour,
        text.txtSize,
        text.align
      );
    });

    // render all lines
    this.lines.forEach((line) => {
      this._drawLine(
        line.x1,
        line.y1,
        line.x2,
        line.y2,
        line.color,
        line.width
      );
    });

    // render all circles
    this.circles.forEach((circle) => {
      this._drawCircle(circle.x, circle.y, circle.radius, circle.color);
    });

    this.emptyCircles.forEach((circle) => {
      this._drawCircleEmpty(
        circle.x,
        circle.y,
        circle.radius,
        circle.color,
        circle.width
      );
    });

    // render all rectangles
    this.rectangles.forEach((rectangle) => {
      this._drawRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
        rectangle.color,
        rectangle.borderRadius
      );
    });

    // render all buttons
    this.sceneManager.activeScene.buttons.forEach((button) => {
      this._drawButton(
        button.text,
        button.x,
        button.y,
        button.width,
        button.height,
        button.color,
        button.borderRadius,
        button.align,
        button.callback
      );
    });

    this.canvasContext.restore();

    // clear texts and lines for next render cycle
    this.lines = [];
    this.rectangles = [];
    this.circles = [];
    this.emptyCircles = [];
    this.texts = [];
  };

  _debugRenderPhysics = () => {
    let bodies = Matter.Composite.allBodies(this.physicsEngine.world);

    this.canvasContext.beginPath();

    for (var i = 0; i < bodies.length; i += 1) {
      var vertices = bodies[i].vertices;

      this.canvasContext.moveTo(vertices[0].x, vertices[0].y);

      for (var j = 1; j < vertices.length; j += 1) {
        this.canvasContext.lineTo(vertices[j].x, vertices[j].y);
      }

      this.canvasContext.lineTo(vertices[0].x, vertices[0].y);
    }

    this.canvasContext.lineWidth = 1;
    this.canvasContext.strokeStyle = "#fff";
    this.canvasContext.stroke();
  };

  _collisionDetection = () => {
    //simple AABB collision check that notifies colliders of the collision
    for (var i = 0; i < this.sceneManager.activeScene.length - 1; i++) {
      var coll1 = this.sceneManager.activeScene[i];
      coll1Size = coll1.GetSize();
      for (var j = i; j < this.sceneManager.activeScene.length; j++) {
        var coll2 = this.sceneManager.activeScene[j];
        coll2Size = coll2.GetSize();
        //check for AABB collisions
        if (
          coll1.x + coll1Size.width > coll2.x &&
          coll1.y + coll1Size.height > coll2.y &&
          coll1.x < coll2.x + coll2Size.width &&
          coll1.y < coll2.y + coll2Size.height
        ) {
          //notify colliders
          coll1.OnCollision(coll2);
          coll2.OnCollision(coll1);
        }
      }
    }
  };

  _resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
  };

  _drawLine = (x1, y1, x2, y2, color = "#fff", width = 1) => {
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(x1, y1);
    this.canvasContext.lineTo(x2, y2);
    this.canvasContext.lineWidth = width;
    this.canvasContext.strokeStyle = color;
    this.canvasContext.stroke();
  };

  _drawCircle = (x, y, radius, color = "#fff") => {
    this.canvasContext.beginPath();
    this.canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
    this.canvasContext.fillStyle = color;
    this.canvasContext.fill();
  };

  _drawRect = (x, y, width, height, color = "#fff", borderRadius = 0) => {
    this.canvasContext.beginPath();
    this.canvasContext.roundRect(x, y, width, height, borderRadius);
    this.canvasContext.fillStyle = color;
    this.canvasContext.fill();
  };

  _drawCircleEmpty = (x, y, radius, color = "#fff", width = 1) => {
    this.canvasContext.beginPath();
    this.canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
    this.canvasContext.lineWidth = width;
    this.canvasContext.strokeStyle = color;
    this.canvasContext.stroke();
  };

  _drawImage = (image, x, y, centered = false) => {
    // this.canvasContext.save();
    this.canvasContext.translate(x, y);
    if (centered)
      this.canvasContext.translate(image.width / 2, image.height / 2);
    this.canvasContext.drawImage(image, 0, 0);
    // this.canvasContext.restore();
  };

  _drawImageExt = (
    image,
    x,
    y,
    width,
    height,
    angle,
    scaleX,
    scaleY,
    bodyOffset
  ) => {
    // save GL stack
    this.canvasContext.save();
    // translate to origin, then rotate
    this.canvasContext.translate(x, y);
    //transpose angle from degrees to radians
    let angleRad = (angle * Math.PI) / 180;
    this.canvasContext.rotate(angleRad); // this is needed by the level editor
    // check for rigidBody offset
    this.canvasContext.translate(-bodyOffset.x / 2, -bodyOffset.y / 2);
    // scale and draw
    this.canvasContext.scale(scaleX, scaleY);
    this.canvasContext.drawImage(image, 0, 0, width, height);
    // restore GL stack
    this.canvasContext.restore();
  };

  _drawText = (txt, x, y, txtColour, txtSize, align = "left") => {
    this.canvasContext.textAlign = align;
    this.canvasContext.textBaseline = "middle";
    this.canvasContext.fillStyle = txtColour;
    this.canvasContext.font = txtSize + "px Arial";
    this.canvasContext.fillText(txt, x, y);
  };

  _drawButton = (
    text,
    x,
    y,
    width,
    height,
    color = "#fff",
    borderRadius = 0,
    align = "center"
  ) => {
    this._drawRect(x, y, width, height, color, borderRadius);
    this._drawText(text, x + width / 2, y + height / 2, "#000", 20, align);
  };
}

const engine = new Engine();
