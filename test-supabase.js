// Supabase 연결 테스트 스크립트
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Supabase 연결 테스트 시작...');
console.log(`📍 URL: ${supabaseUrl}`);
console.log(`🔑 Key: ${supabaseKey?.slice(0, 20)}...`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // doctors 테이블 조회 시도
    const { data, error } = await supabase
      .from('doctors')
      .select('count')
      .limit(1);

    if (error) {
      console.log('\n⚠️  doctors 테이블 조회 실패:', error.message);
      console.log('\n📋 테이블이 없을 수 있습니다. supabase-schema.sql을 실행해주세요.');

      // 기본 연결은 되는지 확인
      const { error: authError } = await supabase.auth.getSession();
      if (!authError) {
        console.log('✅ Supabase 연결 자체는 성공!');
      }
    } else {
      console.log('\n✅ Supabase 연결 성공!');
      console.log(`📊 doctors 테이블 존재 확인됨`);

      // 데이터 개수 확인
      const { count } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });

      console.log(`📈 현재 doctors 레코드 수: ${count || 0}`);
    }
  } catch (err) {
    console.error('❌ 연결 오류:', err.message);
  }
}

testConnection();
