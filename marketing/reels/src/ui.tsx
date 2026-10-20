import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCondensed} from '@remotion/google-fonts/BarlowCondensed';
import {loadFont as loadBarlow} from '@remotion/google-fonts/Barlow';

// Same type and colours as the app's "Metro Line" theme (src/app/globals.css).
export const condensed = loadCondensed('normal', {weights: ['600', '700'], subsets: ['latin']}).fontFamily;
export const barlow = loadBarlow('normal', {weights: ['500', '600'], subsets: ['latin']}).fontFamily;

export const C = {
	bg: '#0d0f12',
	surface: '#16191f',
	text: '#f4f2ec',
	muted: '#9aa0aa',
	amber: '#ffb400',
	go: '#34d37f',
};

// Phone screenshots are 1080 x 2424.
export const SCREEN_RATIO = 2424 / 1080;

/** Dark asphalt background with a slowly drifting amber glow, like the app's hero card. */
export const Backdrop: React.FC = () => {
	const f = useCurrentFrame();
	const x = 72 + 10 * Math.sin(f / 70);
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(1000px 800px at ${x}% 6%, rgba(255,180,0,0.20), transparent 70%), linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 65%)`,
			}}
		/>
	);
};

/** Slides its children up into place and fades them in, starting at `delay` frames. */
export const Rise: React.FC<{delay?: number; distance?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
	delay = 0,
	distance = 70,
	style,
	children,
}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: f - delay, fps, config: {damping: 20, stiffness: 170, mass: 0.7}});
	return <div style={{...style, opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * distance}px)`}}>{children}</div>;
};

/** Fades a whole scene out over its last few frames, so cuts don't feel abrupt. */
export const SceneFade: React.FC<{duration: number; out?: number; children: React.ReactNode}> = ({duration, out = 6, children}) => {
	const f = useCurrentFrame();
	const opacity = interpolate(f, [duration - out, duration], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

/** The three amber lane-marking dashes used on the store screenshots. */
export const Dashes: React.FC<{delay?: number}> = ({delay = 0}) => {
	const f = useCurrentFrame();
	return (
		<div style={{display: 'flex', gap: 18, marginTop: 34}}>
			{[0, 1, 2].map((i) => {
				const s = interpolate(f - delay - i * 3, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				return <div key={i} style={{width: 46, height: 9, background: C.amber, transform: `scaleX(${s})`, transformOrigin: 'left'}} />;
			})}
		</div>
	);
};

export type Line = {text: string; accent?: boolean};

/** Eyebrow + big condensed headline in the top safe area of a reel. */
export const Headline: React.FC<{eyebrow?: string; lines: Line[]; delay?: number; top?: number; size?: number}> = ({
	eyebrow,
	lines,
	delay = 0,
	top = 230,
	size = 120,
}) => (
	<div style={{position: 'absolute', top, left: 80, right: 120}}>
		{eyebrow && (
			<Rise delay={delay}>
				<div style={{fontFamily: barlow, fontWeight: 600, fontSize: 34, letterSpacing: '0.22em', color: C.amber, textTransform: 'uppercase'}}>{eyebrow}</div>
			</Rise>
		)}
		<div style={{marginTop: eyebrow ? 18 : 0}}>
			{lines.map((l, i) => (
				<Rise key={i} delay={delay + 4 + i * 5}>
					<div style={{fontFamily: condensed, fontWeight: 700, fontSize: size, lineHeight: 1.02, color: l.accent ? C.amber : C.text}}>{l.text}</div>
				</Rise>
			))}
		</div>
		<Dashes delay={delay + 10 + lines.length * 5} />
	</div>
);

/** A phone with a thin bezel that springs up from below. Children fill the screen (1080 x 2424 ratio). */
export const Phone: React.FC<{width?: number; top?: number; left?: number; delay?: number; rotate?: number; children: React.ReactNode}> = ({
	width = 600,
	top = 780,
	left,
	delay = 0,
	rotate = 0,
	children,
}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: f - delay, fps, config: {damping: 22, stiffness: 120, mass: 0.9}});
	const bezel = 14;
	const screenW = width - bezel * 2;
	const screenH = screenW * SCREEN_RATIO;
	return (
		<div
			style={{
				position: 'absolute',
				left: left ?? (1080 - width) / 2,
				top: top + (1 - p) * 1000,
				width,
				height: screenH + bezel * 2,
				borderRadius: 78,
				background: '#2a2f38',
				padding: bezel,
				boxShadow: '0 50px 140px rgba(0,0,0,0.65), inset 0 0 0 2px #3c424d',
				transform: `rotate(${rotate}deg)`,
			}}
		>
			<div style={{width: screenW, height: screenH, borderRadius: 64, overflow: 'hidden', position: 'relative', background: '#f2f1ee'}}>{children}</div>
		</div>
	);
};

/** An amber ring that draws attention to part of a phone screen. Box is in screenshot pixels (1080 x 2424). */
export const Highlight: React.FC<{x: number; y: number; w: number; h: number; delay?: number}> = ({x, y, w, h, delay = 0}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: f - delay, fps, config: {damping: 12, stiffness: 160}});
	const pulse = 1 + 0.015 * Math.sin((f - delay) / 4);
	return (
		<div
			style={{
				position: 'absolute',
				left: `${(x / 1080) * 100}%`,
				top: `${(y / 2424) * 100}%`,
				width: `${(w / 1080) * 100}%`,
				height: `${(h / 2424) * 100}%`,
				border: `6px solid ${C.amber}`,
				borderRadius: 28,
				boxShadow: `0 0 40px rgba(255,180,0,0.55)`,
				opacity: Math.min(1, p),
				transform: `scale(${(1.25 - 0.25 * p) * pulse})`,
			}}
		/>
	);
};
