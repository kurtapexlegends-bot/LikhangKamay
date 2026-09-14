import { ArrowLeft, ArrowRight, ArrowUp, Smile } from 'lucide-react';

export const CHALLENGE_POOL = [
    { id: 'turn_left', label: 'Turn your face LEFT', instruction: 'Turn gently to your left', icon: ArrowLeft },
    { id: 'turn_right', label: 'Turn your face RIGHT', instruction: 'Turn gently to your right', icon: ArrowRight },
    { id: 'smile', label: 'Smile at the camera', instruction: 'Show a gentle smile', icon: Smile },
    { id: 'nod', label: 'Nod or tilt head UP', instruction: 'Tilt your chin upward', icon: ArrowUp },
];

export function generateChallengeSequence() {
    const shuffled = [...CHALLENGE_POOL].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1]];
}
