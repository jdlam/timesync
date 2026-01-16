export interface TimeSlot {
	isoTimestamp: string;
	displayTime: string;
	date: string;
	isSelected: boolean;
}

export interface DateColumn {
	date: string;
	displayDate: string;
	slots: TimeSlot[];
}

export type GridMode = "select" | "view";
