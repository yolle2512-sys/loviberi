const { createClient } = require('redis');

let client;
async function getRedis(){
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => {});
    await client.connect();
  }
  return client;
}
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const {code,userId,name}=req.body||{};
    if(!code) return res.status(400).json({error:'code required'});
    const r=await getRedis();
    const userKey=userId ? `loviberi:user:${userId}` : null;
    if(userKey){
      const existing=await r.get(userKey);
      if(existing){
        const obj=JSON.parse(existing);
        return res.status(200).json({code:obj.code,status:obj.status||'active'});
      }
    }
    const key=`loviberi:ticket:${code}`;
    const obj={code,name:name||'Гость',userId:userId||null,status:'active',createdAt:new Date().toISOString()};
    const created=await r.set(key,JSON.stringify(obj),{NX:true});
    if(created==='OK' && userKey) await r.set(userKey,JSON.stringify(obj));
    if(created!=='OK'){
      const existing=await r.get(key);
      if(existing) return res.status(200).json({code:JSON.parse(existing).code,status:JSON.parse(existing).status});
      return res.status(409).json({error:'Code collision, try again'});
    }
    return res.status(200).json({code,status:'active'});
  }catch(e){return res.status(500).json({error:'Server error'});}
};