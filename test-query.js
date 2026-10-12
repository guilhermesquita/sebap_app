const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function test() {
    const { data, error } = await supabase.from('materias').select(`
        id,
        aulas(count)
    `).limit(1)
    console.log(data, error)
}
test()
