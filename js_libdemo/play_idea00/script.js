const { animate, utils, createDraggable, spring, createTimer } = anime;

const [ $logo ] = utils.$('.logo.js');
const [ $button ] = utils.$('button');
let rotations = 0;

const params = {
  duration: 1500,
  bounce: 0.7,
  rotate: () => rotateLogo(),
  timerdur: 1000,
};

// Created a bounce animation loop
animate('.logo.js', {
  scale: [
    { to: 1.25, ease: 'inOut(3)', duration: 200 },
    { to: 1, ease: spring({ bounce: .7 }) }
  ],
  loop: true,
  loopDelay: 250,
});

// Make the logo draggable around its center
createDraggable('.logo.js', {
  container: [0, 0, 0, 0],
  releaseEase: spring({ bounce: .7 })
});

// Animate logo rotation on click
const rotateLogo = () => {
  rotations++;
  $button.innerText = `rotations: ${rotations}`;
  animate($logo, {
    rotate: rotations * 360,
    ease: 'out(4)',
    duration: params.duration,
  });
}

const [ $time, $count ] = utils.$('.value');

createTimer({
  duration: params.timerdur,
  loop: true,
  frameRate: 30,
  onUpdate: self => $time.innerHTML = self.currentTime,
  onLoop: self => $count.innerHTML = self._currentIteration
});

$button.addEventListener('click', rotateLogo);

const gui = new lil.GUI({ title: 'Logo Controls' });
gui.add(params, 'duration', 300, 3000, 50).name('Rotate Duration (ms)');
gui.add(params, 'bounce', 0.1, 1.0, 0.05).name('Spring Bounce');
gui.add(params, 'rotate').name('Rotate Logo');
gui.add(params, 'timerdur', 300, 3000, 50).name('Timer Duration');