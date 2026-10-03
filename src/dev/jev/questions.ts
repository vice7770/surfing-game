/**
 * The typed questions Jev answers, by phase. Each asks one thing (the TypeSafe
 * docs: decompose, then combine in code), and options that do not exist right
 * now are left out: the pop-up only while the game shows its prompt, the open
 * face only once there is one, the fresh start only when the chance is gone.
 * Instructions and criteria stay short, since every word is sent on every call.
 */
import type { Questions } from './answers';
import type { Observation } from './observe';

export function questionsFor(obs: Observation): Questions {
  const q: Questions = {};
  const side = obs.openSide;
  switch (obs.phase) {
    case 'prone':
    case 'recover': {
      const paddle: Record<string, string> = {
        go: 'yes: a wave is coming a few seconds away, about to reach the board, or lifting it',
        wait: 'no: the water is flat, the wave is far behind, or it has passed under',
      };
      if (obs.inside) paddle.reset = 'no wave to catch here, inside the break: go back out to the take-off spot';
      q.paddle = { type: 'choice', instructions: 'Should the surfer paddle hard for the beach now?', criteria: paddle };
      if (side) {
        q.aim = {
          type: 'choice',
          instructions: 'Which way should the board point while paddling?',
          criteria: { open: `angled toward the open face, to the ${side}, away from the breaking part`, beach: 'straight at the beach' },
        };
      }
      if (obs.state.prompt) {
        q.pop = {
          type: 'choice',
          instructions: 'The game shows POP UP NOW. Stand up?',
          criteria: { stand: 'yes: the prompt is the moment to stand up', wait: 'no, keep paddling lying down' },
        };
      }
      break;
    }
    case 'push':
    case 'landing':
    case 'standing': {
      const line: Record<string, string> = side
        ? {
          along: `ride along the face toward the open ${side}, ahead of the breaking part`,
          climb: 'turn up the face: when low on it with good speed',
          drop: 'turn down the face: when high near the lip, or slow',
          straight: 'straighten out toward the beach: the wave closes out or balance is going',
        }
        : {
          straight: 'straighten out toward the beach: the wave closes out or balance is going',
          climb: 'turn up the face: when low on it with good speed',
          drop: 'turn down the face: when high near the lip, or slow',
        };
      if (obs.passed) line.out = 'the ride is over: go back out to the take-off spot';
      q.line = { type: 'choice', instructions: 'Where should the surfer steer?', criteria: line };
      q.weight = {
        type: 'choice',
        instructions: 'Where should the surfer put their weight?',
        criteria: {
          centre: 'centred: speed is good, hold it',
          forward: 'front foot to speed up: slow, or the wave is getting away',
          back: 'back foot to slow down: only when racing out onto the flat ahead of the wave',
        },
      };
      q.stance = {
        type: 'choice',
        instructions: 'How should the surfer stand?',
        criteria: {
          low: 'crouched low and steady: balance wobbling or going, or dropping down the face',
          tall: 'upright: balance steady on a smooth face',
          pump: 'crouch and extend to pump for speed: slow on an open face',
        },
      };
      break;
    }
    case 'fallen':
      q.recover = {
        type: 'choice',
        instructions: 'The surfer fell off. What next?',
        criteria: { board: 'swim to the board and climb back on: it is within reach', out: 'go straight back out to the take-off spot' },
      };
      break;
  }
  return q;
}
