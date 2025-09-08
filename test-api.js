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

async function testJobCreation(query, country = 'us') {
  console.log(`🔍 Testing job creation for: "${query}" in country: ${country}`)
  try {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, country })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Job created successfully!')
      console.log(`📋 Job ID: ${data.id}`)
      return data.id
    } else {
      console.error('❌ Job creation failed:', data)
      return null
    }
  } catch (error) {
    console.error('❌ Job creation request failed:', error.message)
    return null
  }
}

async function testJobStatus(jobId, maxAttempts = 20) {
  console.log(`📊 Testing job status polling for: ${jobId}`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`  🔄 Attempt ${attempt}/${maxAttempts}`)
      
      const response = await fetch(`${API_BASE}/jobs/${jobId}`)
      const data = await response.json()
      
      if (response.ok) {
        console.log(`  📌 Status: ${data.status} - ${data.message}`)
        
        if (data.status === 'completed') {
          console.log('✅ Job completed successfully!')
          if (data.result?.products) {
            console.log(`📊 Found ${data.result.products.length} products out of ${data.result.totalFound} total results`)
            
            if (data.result.products.length > 0) {
              console.log('🛍️ Sample product:')
              const sample = data.result.products[0]
              console.log(`  - Name: ${sample.name}`)
              console.log(`  - Price: ${sample.currency} ${sample.price}`)
              console.log(`  - Source: ${sample.source}`)
              console.log(`  - URL: ${sample.url}`)
            }
          }
          return true
        }
        
        if (data.status === 'failed') {
          console.error('❌ Job failed:', data.error)
          return false
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } else {
        console.error('❌ Failed to get job status:', data)
        return false
      }
    } catch (error) {
      console.error('❌ Job status request failed:', error.message)
      return false
    }
  }
  
  console.error('❌ Job polling timed out')
  return false
}

async function testJobFlow(query, country) {
  console.log(`\n🚀 Testing complete job flow: "${query}" in ${country}`)
  console.log('='.repeat(60))
  
  // Step 1: Create job
  const jobId = await testJobCreation(query, country)
  if (!jobId) return false
  
  // Step 2: Poll job status
  const success = await testJobStatus(jobId)
  return success
}

async function runTests() {
  console.log('🚀 Starting API tests...\n')
  
  // Test health check first
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    console.log('❌ Server not responding, make sure it\'s running')
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test job flow with supported countries
  console.log('🇺🇸 Testing job flow with US (supported country):')
  await testJobFlow('wireless headphones', 'us')
  
  console.log('\n' + '-'.repeat(30) + '\n')
  
  // Test job flow with unsupported countries - should fail with error
  console.log('🇲🇦 Testing job flow with Morocco (unsupported country - should fail):')
  await testJobFlow('laptop gaming', 'ma')
  
  console.log('\n🎉 All tests completed!')
}

// Run the tests
runTests().catch(console.error)
