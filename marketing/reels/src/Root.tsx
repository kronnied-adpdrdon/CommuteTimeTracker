import React from 'react';
import {Composition} from 'remotion';
import {REEL1_FRAMES, Reel1, Reel1Props} from './Reel1';

export const Root: React.FC = () => (
	<Composition
		id="Reel1"
		component={Reel1}
		durationInFrames={REEL1_FRAMES}
		fps={30}
		width={1080}
		height={1920}
		defaultProps={{launched: false} satisfies Reel1Props}
	/>
);
