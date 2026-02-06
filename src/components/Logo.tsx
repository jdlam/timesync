import { useId } from "react";

interface LogoProps {
	size?: number;
	showMotionLines?: boolean;
	className?: string;
}

export function Logo({ size = 32, showMotionLines, className }: LogoProps) {
	const id = useId();
	const gradientId = `logo-grad-${id}`;
	const show = showMotionLines ?? size >= 32;

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 140 140"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#0d9488" />
					<stop offset="100%" stopColor="#10b981" />
				</linearGradient>
			</defs>
			<rect
				x="10"
				y="10"
				width="120"
				height="120"
				rx="28"
				fill={`url(#${gradientId})`}
			/>
			<g transform="rotate(-18, 70, 70)">
				<path
					d="M46,44 C46,34 94,34 94,44 C94,56 80,62 70,70 C80,78 94,84 94,96 C94,106 46,106 46,96 C46,84 60,78 70,70 C60,62 46,56 46,44 Z"
					fill="white"
				/>
			</g>
			{show && (
				<>
					<path
						d="M104,34 Q110,40 104,46"
						stroke="white"
						strokeWidth="3.5"
						fill="none"
						strokeLinecap="round"
						opacity="0.55"
					/>
					<path
						d="M112,38 Q118,44 112,50"
						stroke="white"
						strokeWidth="2.5"
						fill="none"
						strokeLinecap="round"
						opacity="0.35"
					/>
					<path
						d="M36,94 Q30,100 36,106"
						stroke="white"
						strokeWidth="3.5"
						fill="none"
						strokeLinecap="round"
						opacity="0.55"
					/>
					<path
						d="M28,90 Q22,96 28,102"
						stroke="white"
						strokeWidth="2.5"
						fill="none"
						strokeLinecap="round"
						opacity="0.35"
					/>
				</>
			)}
		</svg>
	);
}
