const { createClient } = require('redis');
let client;
async function getRedis(){
  if(!client){client=createClient({url:process.env.REDIS_URL});client.on('error',()=>{});await client.connect();}
  return client;
}
module.exports=async(req,res)=>{
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 try{
  const {code}=req.body||{};
  if(!code) return res.status(400).json({error:'Введите код'});
  const r=await getRedis();
  const key=`loviberi:ticket:${code}`;
  const script=`
    local v=redis.call('GET',KEYS[1])
    if not v then return 'NOT_FOUND' end
    local obj=cjson.decode(v)
    if obj.status ~= 'active' then return 'USED' end
    obj.status='used'
    obj.usedAt=ARGV[1]
    redis.call('SET',KEYS[1],cjson.encode(obj))
    return 'OK'
  `;
  const result=await r.eval(script,{keys:[key],arguments:[new Date().toISOString()]});
  if(result==='OK') return res.status(200).json({ok:true,message:'Билет принят. Гость может пройти.'});
  if(result==='USED') return res.status(409).json({ok:false,message:'Этот билет уже был использован.'});
  return res.status(404).json({ok:false,message:'Такого билета нет.'});
 }catch(e){return res.status(500).json({ok:false,message:'Ошибка проверки.'});}
};