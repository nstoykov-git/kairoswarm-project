import { useState } from 'react'
import { useSpeak } from '../hooks/useSpeak'

export default function SpeakForm() {
  const { speak } = useSpeak()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await speak(input)
    setOutput(res.response || res.error || 'No response')
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
        <div className="mt-4 p-4 bg-gray-100 rounded-xl">
          <strong>Response:</strong> {output}
        </div>
      )}
    </div>
  )
}

