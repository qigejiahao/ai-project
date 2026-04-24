async function requestFun() {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: '阿斑是谁？' })
  })
  const data = await response.json()
  console.log('data===', data)
}
requestFun()
