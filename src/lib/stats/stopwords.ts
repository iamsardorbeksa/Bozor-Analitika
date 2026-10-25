/*
 * Stopwords removed from "top words". Chats often mix languages, so all lists are merged.
 * Lists are intentionally chat-flavoured (they include filler like "ok", "lol", "ну").
 */

const EN = `a about above after again against all also am an and any are aren't as at be because been before
being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each
few for from further get got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself
him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's me more most mustn't my
myself no nor not now of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll
she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they
they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were
weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you
you'd you'll you're you've your yours yourself yourselves im ive dont cant wont didnt doesnt isnt thats youre theyre
ill id whats hes shes lets yeah yes yep yup nope no ok okay okey oke k kk lol lmao omg oh ah um uh hmm hm u ur ya yah
like really gonna wanna gotta got get go going one know think see well good much even still would also back
right thing things way want need make made time day today tomorrow tonight yesterday now then there here something
anything everything nothing someone thing sure maybe pls please thx thank thanks sorry haha hahaha hehe xd also cause
cuz coz bc though tho gonna let us say said tell told come came went take took give gave put via ill wasnt arent`

const RU = `и в во не что он на я с со как а то все всё она так его но да ты к у же вы за бы по только ее её мне было
вот от меня еще ещё нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять
уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто
чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем
чтобы нее неё сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через
эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя
такой им более всегда конечно всю между это мне меня тебе тебя ок окей ага угу да нет ну вот просто короче типа
щас сейчас ладно блин пока привет спасибо хорошо норм вообще очень тоже кстати точно знаю думаю надо будет было
есть нету какой какие какое чё че чо ща давай мб может пожалуйста пж плз хах хаха ахах ахаха лол`

const UZ_LATIN = `va bilan uchun lekin ammo yoki ham esa bu shu u ular men sen siz biz mening sening sizning bizning
uning ularning menga senga sizga bizga unga ularga meni seni sizni bizni uni ularni da ga ni ning dan edi emas bor
yo'q yoq ha xa yo'q kerak mumkin endi hali hozir keyin oldin juda eng bir ikki nima nega qanday qachon qayerda kim
qaysi shunday bunday mana ana mayli xop xo'p ok okey rahmat salom assalomu alaykum vaalaykum assalom yaxshi zo'r
bo'ldi bo'lsa bo'lib bo'ladi qildi qilib qilish deb dedi degan deyapti boraman kelaman ekan emish ekanku chi ku
mi -chi -mi -ku -da to'g'ri aka opa uka singil hm hmm ha-ha haha xaxa`

const UZ_CYRILLIC = `ва билан учун лекин аммо ёки ҳам эса бу шу у улар мен сен сиз биз менинг сенинг сизнинг бизнинг
унинг уларнинг менга сенга сизга бизга унга уларга мени сени сизни бизни уни уларни да га ни нинг дан эди эмас бор
йўқ ҳа керак мумкин энди ҳали ҳозир кейин олдин жуда энг бир икки нима нега қандай қачон қаерда ким қайси шундай
бундай мана ана майли хўп ок рахмат раҳмат салом яхши зўр бўлди бўлса бўлиб бўлади қилди қилиб деб деди экан`

const ES = `de la que el en y a los del se las por un para con no una su al lo como más mas pero sus le ya o este sí si
porque esta entre cuando muy sin sobre también tambien me hasta hay donde quien desde todo nos durante todos uno les ni
contra otros ese eso ante ellos e esto mí antes algunos qué que unos yo otro otras otra él tanto esa estos mucho
quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tú te ti tu tus ellas nosotras vosotros
os mío mía tuyo tuya suyo nuestro vuestro esos esas estoy estás está estamos están es soy eres son fue era ser ha he
has hemos han hay tengo tiene tienes tenemos tienen bueno bien vale dale sí jaja jajaja xd pues entonces así asi
ok oye q k xq pq porq tmb tb aqui aquí ahora hoy mañana`

const TR = `ve bir bu da de için ile ama ben sen o biz siz onlar ne mi mı mu mü çok daha gibi kadar şey var yok
diye olarak sonra ki şu her en ya veya ise değil degil evet hayır hayir tamam tmm ok okey bana sana ona bize size
onlara beni seni onu bizi sizi onları benim senin onun bizim sizin onların şimdi simdi bugün yarın dün nasıl neden
niye nerede kim hangi oldu olur olsun olan bi şey sey yani işte iste hadi abi abla canım canim haha ahah`

const PT = `de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu
sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus
quem nas me esse eles estão você voce tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual
será nós tenho lhe deles essas esses pelas este fosse dele tu te vocês vos lhes meus minhas teu tua teus tuas nosso
nossa nossos nossas aquele aquela isto aquilo estou está estamos tá ta né ne vc vcs pq tbm kkk kkkk sim ok`

const DE = `der die das und ist in zu den von mit sich des auf für nicht ein eine als auch es an er hat aus bei
sind noch nach wird einer um am sie dass oder wie aber wenn ja nein so was ich du wir ihr mir dich dir mich uns
euch mal schon nur doch hab habe jetzt dann denn kann gut ok okay`

const FR = `le la les de des du un une et à a en est que qui dans pour pas sur au avec ce ces il elle je tu nous vous
ils elles on ne se sa son ses mais ou donc ni car oui non très tres plus moi toi lui leur y c'est cest j'ai jai ça
ca bon bien ok mdr ptdr`

/** Generic chat filler that shows up regardless of language. */
const GENERIC = `ok okay okey okk ок окей xd https http www com media omitted image video audio sticker gif null
deleted message edited`

const ALL = [EN, RU, UZ_LATIN, UZ_CYRILLIC, ES, TR, PT, DE, FR, GENERIC]

export const STOPWORDS: ReadonlySet<string> = new Set(
  ALL.join(' ')
    .toLowerCase()
    .replace(/[‘’ʻʼ]/g, "'")
    .split(/\s+/)
    .filter(Boolean),
)

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word)
}
