class Scrap extends GameObject {
  Start = () => {
    console.log("Starting");
    this.refuel = 0.01;
    // this.player = engine.sceneManager.activeScene.Find("Ship");
  };

  SetPlayer = (player) => {
    this.player = player;
  };

  Update = (delta) => {
    if (!this.player) return;
    if (this.player.canStart) {
      let distance = engine.Distance(this, this.player);
      if (this.visible && distance < this.player.GetMagnetRange()) {
        this.player.addFuel(this.refuel);
        this.visible = false;
        setTimeout(() => {
          this.visible = true;
        }, 5000);
      }
    }
  };
}

engine.RegisterClass("Scrap", Scrap);
