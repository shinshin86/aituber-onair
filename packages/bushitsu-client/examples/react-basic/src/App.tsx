import { FormEvent, useCallback, useState } from "react";
import { useBushitsuClient } from "@aituber-onair/bushitsu-client/react";

const serverUrl = import.meta.env.VITE_BUSHITSU_SERVER_URL ?? "";
const room = import.meta.env.VITE_BUSHITSU_ROOM ?? "";
const userName = import.meta.env.VITE_BUSHITSU_USER ?? "ReactUser";

interface ChatMessage {
	id: string;
	from: string;
	text: string;
	isMention: boolean;
}

export default function App() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");

	const handleComment = useCallback(
		(text: string, from: string, isMention: boolean) => {
			setMessages((prev) => [
				...prev,
				{
					id: `${Date.now()}-${Math.random()}`,
					from,
					text,
					isMention,
				},
			]);
		},
		[],
	);

	const { isConnected, sendMessage, getLastMentionUser } = useBushitsuClient({
		serverUrl,
		room,
		userName,
		isEnabled: serverUrl !== "" && room !== "" && userName !== "",
		onComment: handleComment,
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!input.trim()) {
			return;
		}
		sendMessage(input.trim());
		setInput("");
	};

	const mention = getLastMentionUser();

	return (
		<div
			style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}
		>
			<h1>Bushitsu React Example</h1>
			<p>
				Status: <strong>{isConnected ? "Connected" : "Disconnected"}</strong>
			</p>
			<p>Room: {room || "(set VITE_BUSHITSU_ROOM)"}</p>
			<p>User: {userName || "(set VITE_BUSHITSU_USER)"}</p>

			{mention ? <p>Last mention from: {mention}</p> : null}

			<section
				style={{
					border: "1px solid #ccc",
					borderRadius: 8,
					padding: "1rem",
					height: 280,
					overflowY: "auto",
					background: "#fafafa",
					marginBottom: "1rem",
				}}
			>
				{messages.length === 0 ? (
					<p style={{ color: "#888" }}>No messages yet.</p>
				) : (
					<ul style={{ listStyle: "none", padding: 0 }}>
						{messages.map((message) => (
							<li key={message.id} style={{ marginBottom: 8 }}>
								<strong>
									{message.from}
									{message.isMention ? " (mention)" : ""}:
								</strong>{" "}
								<span>{message.text}</span>
							</li>
						))}
					</ul>
				)}
			</section>

			<form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
				<input
					type="text"
					value={input}
					onChange={(event) => setInput(event.target.value)}
					placeholder="Type your message"
					style={{ flex: 1, padding: "0.5rem" }}
				/>
				<button type="submit" disabled={!isConnected}>
					Send
				</button>
			</form>
		</div>
	);
}
