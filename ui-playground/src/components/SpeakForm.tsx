import { useState } from 'react'
import { useSpeak } from '../hooks/useSpeak'

export default function SpeakForm() {
  const { speak } = useSpeak()
  const [participantId, setParticipantId] = useState('')
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!participantId.trim()) {
      setOutput('Please enter a participant ID.')
      return
    }

    const res = await speak(participantId, message)
    setOutput(
      res?.status === 'ok'
        ? JSON.stringify(res.entry, null, 2)
        : res?.error || 'No response'
    )
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <input
        type="text"
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        placeholder="Enter participant ID"
        className="w-full p-2 border rounded-xl"
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something..."
          className="p-2 border rounded-xl"
        />
        <button
          type="submit"
          className="bg-black text-white py-2 px-4 rounded-xl hover:bg-gray-800"
        >
          Send to /speak
        </button>
      </form>

      {output && (
        <pre className="mt-4 p-4 bg-gray-100 rounded-xl whitespace-pre-wrap">
          <strong>Response:</strong> {output}
        </pre>
      )}
    </div>
  )
}
