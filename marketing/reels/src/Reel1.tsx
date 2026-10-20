import React from 'react';
import {AbsoluteFill, Html5Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Backdrop, C, Headline, Highlight, Phone, Rise, SceneFade, barlow, condensed} from './ui';

// 120 BPM at 30 fps: one beat = 15 frames, one bar = 60 frames. Scenes start on the beat.
const S = {
	hook: [0, 90],
	guess: [90, 90],
	auto: [180, 150],
	arrive: [330, 90],
	week: [420, 120],
	reports: [540, 120],
	end: [660, 120],
} as const;

export const REEL1_FRAMES = 780;

export type Reel1Props = {launched: boolean};

// Voiceover (ElevenLabs, voice "Marcus"; see voice/generate.py). `at` is when the clip starts,
// `speech` how many frames of it are spoken, measured from the clips. Update both if a clip is regenerated.
const voiceover = (launched: boolean) => [
	{src: '01-hook', at: S.hook[0] + 6, speech: 69},
	{src: '02-guess', at: S.guess[0], speech: 64},
	{src: '03-auto', at: S.auto[0] + 8, speech: 71},
	{src: '04-arrive', at: S.arrive[0] + 4, speech: 59},
	{src: '05-week', at: S.week[0] + 6, speech: 58},
	{src: '06-reports', at: S.reports[0] + 6, speech: 87},
	launched ? {src: '07-end-free', at: S.end[0] + 6, speech: 81} : {src: '07-end-soon', at: S.end[0] + 6, speech: 76},
];

const MUSIC = 0.5;
const MUSIC_UNDER_VOICE = 0.18;
const VOICE = 1.4;

/** Music volume: dips while a line is spoken (6 frames down before it, 12 frames back up after). */
const musicVolume = (f: number, lines: ReturnType<typeof voiceover>) => {
	const dip = Math.max(
		...lines.map((l) => interpolate(f, [l.at - 6, l.at, l.at + l.speech, l.at + l.speech + 12], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})),
	);
	return interpolate(dip, [0, 1], [MUSIC, MUSIC_UNDER_VOICE]);
};

export const Reel1: React.FC<Reel1Props> = ({launched}) => {
	const lines = voiceover(launched);
	return (
		<AbsoluteFill style={{background: C.bg}}>
			<Backdrop />
			<Html5Audio src={staticFile('music.wav')} volume={(f) => musicVolume(f, lines)} />
			{lines.map((l) => (
				<Sequence key={l.src} from={l.at} layout="none">
					<Html5Audio src={staticFile(`vo/${l.src}.mp3`)} volume={VOICE} />
				</Sequence>
			))}
			<Sequence from={S.hook[0]} durationInFrames={S.hook[1]}>
				<Hook />
			</Sequence>
			<Sequence from={S.guess[0]} durationInFrames={S.guess[1]}>
				<Guess />
			</Sequence>
			<Sequence from={S.auto[0]} durationInFrames={S.auto[1]}>
				<AutoStart />
			</Sequence>
			<Sequence from={S.arrive[0]} durationInFrames={S.arrive[1]}>
				<Arrive />
			</Sequence>
			<Sequence from={S.week[0]} durationInFrames={S.week[1]}>
				<Week />
			</Sequence>
			<Sequence from={S.reports[0]} durationInFrames={S.reports[1]}>
				<Reports />
			</Sequence>
			<Sequence from={S.end[0]} durationInFrames={S.end[1]}>
				<EndCard cta={launched ? 'Free on Google Play' : 'Coming soon to Google Play'} />
			</Sequence>
		</AbsoluteFill>
	);
};

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** "How long is your commute, really?" over a timer that races through a commute. */
const Hook: React.FC = () => {
	const f = useCurrentFrame();
	const secs = interpolate(f, [8, 82], [0, 52 * 60 + 17], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const timer = `${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}`;
	const progress = interpolate(f, [8, 82], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	return (
		<SceneFade duration={S.hook[1]}>
			<Headline lines={[{text: 'How long is'}, {text: 'your commute,'}, {text: 'really?', accent: true}]} size={150} top={250} delay={2} />
			<Rise delay={14} style={{position: 'absolute', top: 960, left: 0, right: 0, textAlign: 'center'}}>
				<div style={{fontFamily: condensed, fontWeight: 600, fontSize: 210, color: C.text, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums'}}>{timer}</div>
				<div style={{fontFamily: barlow, fontWeight: 600, fontSize: 34, letterSpacing: '0.22em', color: C.muted, marginTop: -6}}>COMMUTE TIME</div>
			</Rise>
			<RouteLine progress={progress} top={1330} delay={18} />
		</SceneFade>
	);
};

/** The app's route line: green start dot, amber dotted track, hollow destination ring. */
const RouteLine: React.FC<{progress: number; top: number; delay: number}> = ({progress, top, delay}) => {
	const f = useCurrentFrame();
	const show = interpolate(f - delay, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const left = 150;
	const width = 780;
	const dots = 26;
	return (
		<div style={{position: 'absolute', top, left, width, height: 40, opacity: show}}>
			{Array.from({length: dots}).map((_, i) => {
				const x = ((i + 1) / (dots + 1)) * width;
				const passed = x / width <= progress;
				return <div key={i} style={{position: 'absolute', left: x - 6, top: 14, width: 12, height: 12, borderRadius: 6, background: passed ? C.amber : '#4a505b'}} />;
			})}
			<div style={{position: 'absolute', left: -20, top: 0, width: 40, height: 40, borderRadius: 20, background: C.go}} />
			<div style={{position: 'absolute', left: width - 22, top: -2, width: 44, height: 44, borderRadius: 22, border: `7px solid ${C.text}`, boxSizing: 'border-box'}} />
			<div
				style={{
					position: 'absolute',
					left: progress * width - 17,
					top: 3,
					width: 34,
					height: 34,
					borderRadius: 17,
					background: C.amber,
					boxShadow: '0 0 30px rgba(255,180,0,0.8)',
				}}
			/>
		</div>
	);
};

/** "Most of us just guess." then "MYCE measures it." */
const Guess: React.FC = () => {
	const f = useCurrentFrame();
	const second = f >= 30;
	return (
		<SceneFade duration={S.guess[1]} out={4}>
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				{!second ? (
					<div style={{textAlign: 'center'}}>
						<Rise>
							<div style={{fontFamily: condensed, fontWeight: 700, fontSize: 150, color: C.text, lineHeight: 1}}>Most of us</div>
						</Rise>
						<Rise delay={5}>
							<div style={{fontFamily: condensed, fontWeight: 700, fontSize: 150, color: C.muted, lineHeight: 1}}>just guess.</div>
						</Rise>
					</div>
				) : (
					<div style={{textAlign: 'center'}}>
						<Rise delay={30}>
							<Img src={staticFile('icon.png')} style={{width: 190, borderRadius: 44, marginBottom: 34}} />
						</Rise>
						<Rise delay={33}>
							<div style={{fontFamily: condensed, fontWeight: 700, fontSize: 150, color: C.amber, lineHeight: 1}}>MYCE</div>
						</Rise>
						<Rise delay={37}>
							<div style={{fontFamily: condensed, fontWeight: 700, fontSize: 150, color: C.text, lineHeight: 1}}>measures it.</div>
						</Rise>
					</div>
				)}
			</AbsoluteFill>
		</SceneFade>
	);
};

/** Real footage: the trip starts by itself after leaving Home, then the notification lands. */
const AutoStart: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const n = spring({frame: f - 78, fps, config: {damping: 14, stiffness: 140}});
	return (
		<SceneFade duration={S.auto[1]}>
			<Headline eyebrow="Automatic" lines={[{text: 'Leave home.'}, {text: 'It starts', accent: true}, {text: 'by itself.', accent: true}]} />
			<Phone top={830}>
				<OffthreadVideo src={staticFile('auto-start.mp4')} muted style={{width: '100%', display: 'block'}} />
			</Phone>
			<div
				style={{
					position: 'absolute',
					left: 90,
					width: 900,
					top: 760 - (1 - n) * 500,
					opacity: Math.min(1, n * 2),
					borderRadius: 44,
					overflow: 'hidden',
					boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
				}}
			>
				<Img src={staticFile('notification-auto.png')} style={{width: '100%', display: 'block'}} />
			</div>
		</SceneFade>
	);
};

/** The trip saved itself on arrival: highlight the "Auto" row. */
const Arrive: React.FC = () => (
	<SceneFade duration={S.arrive[1]}>
		<Headline eyebrow="Automatic" lines={[{text: 'Arrive.'}, {text: 'It saves itself.', accent: true}]} />
		<Phone top={700} delay={0}>
			<Img src={staticFile('light-home-auto-saved.png')} style={{width: '100%', display: 'block'}} />
			<Highlight x={60} y={1488} w={960} h={185} delay={22} />
		</Phone>
	</SceneFade>
);

/** This week's total and the comparison with last week, popped out of the Home screen. */
const Week: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: f - 28, fps, config: {damping: 15, stiffness: 130}});
	// "This week" card in light-home-week.png, in screenshot pixels.
	const crop = {x: 40, y: 760, w: 1000, h: 505};
	const scale = 920 / crop.w;
	return (
		<SceneFade duration={S.week[1]}>
			<Headline eyebrow="Your week" lines={[{text: 'See where'}, {text: 'your time goes.', accent: true}]} />
			<Phone top={760}>
				<Img src={staticFile('light-home-week.png')} style={{width: '100%', display: 'block'}} />
			</Phone>
			<div
				style={{
					position: 'absolute',
					left: 80,
					top: 900,
					width: crop.w * scale,
					height: crop.h * scale,
					overflow: 'hidden',
					borderRadius: 44,
					opacity: Math.min(1, p * 1.5),
					transform: `scale(${0.7 + 0.3 * p})`,
					boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 0 5px ${C.amber}`,
				}}
			>
				<Img src={staticFile('light-home-week.png')} style={{position: 'absolute', width: 1080 * scale, left: -crop.x * scale, top: -crop.y * scale}} />
			</div>
		</SceneFade>
	);
};

/** Reports screen with the exported PDF sliding in beside it. */
const Reports: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: f - 24, fps, config: {damping: 16, stiffness: 110}});
	return (
		<SceneFade duration={S.reports[1]}>
			<Headline eyebrow="Pro · first month free" lines={[{text: 'Weekly reports.'}, {text: 'PDF in one tap.', accent: true}]} />
			<Phone top={760} left={60} width={540} rotate={-3}>
				<Img src={staticFile('light-reports.png')} style={{width: '100%', display: 'block'}} />
			</Phone>
			<div
				style={{
					position: 'absolute',
					left: 470 + (1 - p) * 700,
					top: 930,
					width: 560,
					transform: `rotate(${5 - 2 * p}deg)`,
					boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
					borderRadius: 10,
					overflow: 'hidden',
				}}
			>
				<Img src={staticFile('report-sample.png')} style={{width: '100%', display: 'block'}} />
			</div>
		</SceneFade>
	);
};

const EndCard: React.FC<{cta: string}> = ({cta}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const icon = spring({frame: f, fps, config: {damping: 11, stiffness: 120}});
	const fadeOut = interpolate(f, [100, 120], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const points = ['Starts and stops by itself', 'No account. No sign-up.', 'Weekly totals at a glance'];
	return (
		<AbsoluteFill style={{alignItems: 'center', paddingTop: 300, opacity: fadeOut}}>
			<Img src={staticFile('icon.png')} style={{width: 260, borderRadius: 60, transform: `scale(${icon})`, boxShadow: '0 30px 90px rgba(255,180,0,0.25)'}} />
			<Rise delay={6}>
				<div style={{fontFamily: condensed, fontWeight: 700, fontSize: 190, color: C.text, lineHeight: 1, marginTop: 40, letterSpacing: '0.04em'}}>MYCE</div>
			</Rise>
			<Rise delay={10}>
				<div style={{fontFamily: barlow, fontWeight: 600, fontSize: 40, color: C.amber, letterSpacing: '0.22em', textTransform: 'uppercase', textAlign: 'center'}}>
					My Commute Experience
				</div>
			</Rise>
			<div style={{marginTop: 70}}>
				{points.map((t, i) => (
					<Rise key={t} delay={18 + i * 6}>
						<div style={{display: 'flex', alignItems: 'center', gap: 26, fontFamily: barlow, fontWeight: 500, fontSize: 50, color: C.text, marginBottom: 26}}>
							<div style={{width: 46, height: 46, borderRadius: 23, background: C.go, color: '#07220f', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
								✓
							</div>
							{t}
						</div>
					</Rise>
				))}
			</div>
			<Rise delay={40}>
				<div
					style={{
						marginTop: 50,
						background: C.amber,
						color: '#16181d',
						fontFamily: condensed,
						fontWeight: 700,
						fontSize: 58,
						letterSpacing: '0.04em',
						whiteSpace: 'nowrap',
						padding: '22px 56px',
						borderRadius: 999,
						textTransform: 'uppercase',
					}}
				>
					{cta}
				</div>
			</Rise>
		</AbsoluteFill>
	);
};
