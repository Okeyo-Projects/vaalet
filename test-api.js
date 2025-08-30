// Simple test script for the new unified search API
const API_BASE = 'http://localhost:8787'

async function testHealthCheck() {
  console.log('🔍 Testing health check...')
  try {
    const response = await fetch(`${API_BASE}/health`)
    const data = await response.json()
    console.log('✅ Health check:', data)
    return true
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    return false
  }
}

async function testSearch(query, country = 'us') {
  console.log(`🔍 Testing search for: "${query}" in country: ${country}`)
  try {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, country })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Search successful!')
      console.log(`📊 Found ${data.products.length} products out of ${data.totalFound} total results`)
      
      if (data.products.length > 0) {
        console.log('🛍️ Sample product:')
        const sample = data.products[0]
        console.log(`  - Name: ${sample.name}`)
        console.log(`  - Price: ${sample.currency} ${sample.price}`)
        console.log(`  - Source: ${sample.source}`)
        console.log(`  - URL: ${sample.url}`)
        console.log(`  - Image: ${sample.imageUrl}`)
      }
      
      return true
    } else {
      console.error('❌ Search failed:', data)
    }
    
    return response.ok
  } catch (error) {
    console.error('❌ Search request failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...\n')
  
  // Test health check first
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    console.log('❌ Server not responding, make sure it\'s running')
    return
  }
  
//   console.log('\n' + '='.repeat(50) + '\n')
  
//   // Test search functionality with different countries
//   console.log('🇺🇸 Testing with US (Google Shopping supported):')
//   await testSearch('wireless headphones', 'us')
  
//   console.log('\n' + '-'.repeat(30) + '\n')
  
//   console.log('🇫🇷 Testing with France (Google Shopping supported):')
//   await testSearch('iphone 16 pro max titane', 'fr')
  
//   console.log('\n' + '-'.repeat(30) + '\n')
  
  console.log('🇲🇦 Testing with Morocco (Google Search fallback):')
  await testSearch('laptop gaming', 'ma')
  
  console.log('\n🎉 Tests completed!')
}

// Run the tests
runTests().catch(console.error)
