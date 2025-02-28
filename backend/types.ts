import { IncomingMessage, ServerResponse } from "http";

export interface User {
	id: string;
	username: string;
	password: string;
	role: 'admin' | 'user';
	balance: number;
}

export interface Car {
	id: string;
	model: string;
	price: number;
	ownerId: string;
}

export interface Profile {
	username: string;
	role: 'admin' | 'user';
	balance: number;
}

export interface AddedCar {
	model: string;
	price: number;
}

export interface BoughtCar {
	username: string;
	carId: string;
}

export interface EditedUser {
	username: string;
	password: string;
	balance: number;
	role: 'user' | 'admin';
}

export interface EditedCurrentUser {
	username: string;
	password: string;
	role: 'user' | 'admin';
}

export interface Login {
	username: string;
	password: string;
}

export interface Register {
	username: string;
	password: string;
}


export type Middelware = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;