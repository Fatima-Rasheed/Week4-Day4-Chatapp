import { io } from "socket.io-client";

const socket = io("https://week4-day4chatapp.vercel.app");

export default socket;