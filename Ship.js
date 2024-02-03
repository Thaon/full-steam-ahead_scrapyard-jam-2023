class Ship extends GameObject {
  Start = () => {
    // get references
    this.checkpoints = engine.sceneManager.activeScene.checkpoints;
    // setup racing stuff
    this.canStart = false;
    this.currentCheckpoint = this.checkpoints[0];
    this.steering = 10;
    this.thrust = 0.0001;
    this.magnetRange = 1;
    this.fuel = 1;
    // utils
    this.matchPhysics = true;
    this.settings = null;

    if (!this.isMine) return;
    console.log("Initializing Ship", this.networkID, this.isMine);

    // setup camera
    engine.camera.SetZoom(0.5);

    if (this.settings?.destroy) this.settings.destroy();
    this.settings = QuickSettings.create(0, 0, "Ship Controls");
    this.settings.setDraggable(false);
    this.settings.addProgressBar("Fuel", 1, this.fuel);
    this.settings.addRange(
      "Scrap Magnet",
      1,
      100,
      this.magnetRange,
      1,
      (value) => {
        // check that we have fuel for it
        if (this.fuel < value / 1000) {
          return;
        }
        this.magnetRange = value;
      }
    );
    this.settings.addRange(
      "Steering Systems",
      1,
      100,
      this.steering,
      1,
      (value) => {
        // check that we have fuel for it
        if (this.fuel < value / 1000) {
          return;
        }
        this.steering = value;
      }
    );
    this.settings.addRange("Thrusters", 1, 100, this.thrust, 1, (value) => {
      // check that we have fuel for it
      if (this.fuel < value / 1000) {
        return;
      }
      this.thrust = value;
    });

    if (networking.isHost) {
      engine.sceneManager.activeScene.AddButton(
        "startBtn",
        "Start",
        this.x - 50,
        this.y,
        200,
        100,
        "#fff",
        5,
        "center",
        () => {
          networking.RPC("StartRace", null);
          engine.sceneManager.activeScene.RemoveButton("startBtn");
        }
      );
    }
  };

  Update = (delta) => {
    // engine.DrawText(
    //   this.networkID + " - Is Mine: " + (this.isMine ? "true" : "false"),
    //   this.x,
    //   this.y - 100,
    //   "#fff",
    //   20,
    //   "center"
    // );

    if (!this.isMine) return;

    if (this.canStart) {
      // deplete fuel
      let consumption = 0;
      consumption += this.magnetRange / 1000;
      consumption += this.thrust / 1000;
      consumption += this.steering / 1000;
      this.fuel -= consumption * delta;
      this.settings.setValue("Fuel", this.fuel);
      // if we have no fuel left, let's decrease all the values to 0
      if (this.fuel <= 0) {
        this.magnetRange = engine.Lerp(this.magnetRange, 1, delta);
        this.steering = engine.Lerp(this.steering, 1, delta);
        this.thrust = engine.Lerp(this.thrust, 1, delta);
        this.settings.setValue("Scrap Magnet", this.magnetRange);
        this.settings.setValue("Steering Systems", this.steering);
        this.settings.setValue("Thrusters", this.thrust);
      }
    }
    // follow camera
    let camera = engine.camera;
    camera.SetPosition(this.x, this.y);

    // set zoom based on velocity
    let velocity = Matter.Vector.magnitudeSquared(this.GetVelocity());
    let maxVelocity = 50;
    let minZoom = 0.4;
    let maxZoom = 0.8;
    let zoom = 1;
    // zoom out when moving fast
    zoom = engine.Lerp(minZoom, maxZoom, 1 - velocity / maxVelocity);
    zoom = engine.Clamp(zoom, minZoom, maxZoom);
    // smoothly zoom
    zoom = engine.Lerp(camera.zoom, zoom, 0.01);
    camera.SetZoom(zoom);
  };

  PhysicsUpdate = () => {
    // calculate ranges
    let steering = engine.Lerp(5, 45, this.steering / 100);
    let thrust = engine.Lerp(0.0005, 0.005, this.thrust / 100);
    let range = engine.Lerp(100, 500, this.magnetRange / 100);

    if (this.canStart) {
      // define target
      let target = this.currentCheckpoint;
      let targetRadius = target.scaleX * 20;
      // acquire new target if needed
      let distance = engine.Distance(this.GetPos(), {
        x: target.x,
        y: target.y,
      });

      if (distance < targetRadius) {
        if (this.isMine) {
          if (this.currentCheckpoint.name == "c_9") {
            youWon = true;
            networking.RPC("FinishRace", null);
          }
        }
        let index = this.checkpoints.indexOf(target);
        if (index < this.checkpoints.length - 1) {
          this.currentCheckpoint = this.checkpoints[index + 1];
        } else {
          this.currentCheckpoint = this.checkpoints[0];
        }
        // add some fuel
        this.addFuel(0.3);
      }

      // move towards target
      this.seekPoint(this.currentCheckpoint, steering, thrust);

      if (!this.isMine) return;
      // draw magnet range
      engine.DrawCircleEmpty(this.x, this.y, range, "#42bbe2", 5);
      // draw checkpoint circle
      engine.DrawCircleEmpty(
        this.currentCheckpoint.x,
        this.currentCheckpoint.y,
        targetRadius,
        "#f00",
        5
      );

      // update networked transform
      if (this.isMine) {
        networking.Update(this.networkID, {
          thrust: this.thrust,
          steering: this.steering,
        });
      }
    }
  };

  GetMagnetRange = () => {
    return engine.Lerp(100, 500, this.magnetRange / 100);
  };

  seekPoint = (point, steering, thrust) => {
    // get the desired velocity vector
    let desiredVelocity = Matter.Vector.sub(point, this.GetPos());
    desiredVelocity = Matter.Vector.normalise(desiredVelocity);

    // apply the force
    //   this.AddForce(Matter.Vector.mult(desiredVelocity, this.steering / 2));
    let velocity = Matter.Vector.normalise(this.GetVelocity());

    // apply thrusters
    let forwardVector = this.GetForwardVector(true);
    let thrustVector = Matter.Vector.mult(forwardVector, thrust);
    this.AddForce(thrustVector);

    // draw line to show desired velocity vector with engine.drawLine(x1, y1, x2, y2, color = "#fff", width = 1)
    engine.DrawLine(this.x, this.y, point.x, point.y, "#0f0", 4);

    //draw line to show velocity vector with engine.drawLine(x1, y1, x2, y2, color = "#fff", width = 1)
    engine.DrawLine(
      this.x,
      this.y,
      this.x + velocity.x * 50,
      this.y + velocity.y * 50,
      "#f00",
      8
    );

    // draw a yellow line to show the desired velocity vector
    engine.DrawLine(
      this.x,
      this.y,
      this.x + desiredVelocity.x * 50,
      this.y + desiredVelocity.y * 50,
      "#ff0",
      8
    );

    // Let's rotate the this!

    // rotate towards the velocity
    let forwardAngle = Math.atan2(forwardVector.y, forwardVector.x);

    // get angle between desired velocity and current velocity
    let desiredVelocityAngle = Math.atan2(desiredVelocity.y, desiredVelocity.x);
    let difference = forwardAngle - desiredVelocityAngle;
    if (difference < -Math.PI) {
      difference = difference + 2 * Math.PI;
    } else if (difference > Math.PI) {
      difference = difference - 2 * Math.PI;
    }
    let degDiff = engine.RadToDeg(difference);

    // rotate left or right depending on which is the smaller angle
    let currentRotation = this.rotation;
    if (degDiff < 0) {
      currentRotation += steering * engine.deltaTime;
    } else {
      currentRotation -= steering * engine.deltaTime;
    }

    this.SetRotationDeg(currentRotation);
  };

  addFuel = (amount) => {
    console.log("Refueled", amount);

    this.fuel += amount;
    if (this.fuel > 1) {
      this.fuel = 1;
    }
  };
}

engine.RegisterClass("Ship", Ship);
