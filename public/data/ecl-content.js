/* LETTERⁿ — ECL EXAM QUEST · CONTENT LIBRARY (V1)
   ---------------------------------------------------------------------------
   EVERY item in this file is ORIGINAL practice content written for LETTERⁿ.
   It follows the published ECL exam FORMAT (eclexam.eu/proba — skills, two
   tasks per skill, 10 items per reading/listening task, 3-option multiple
   choice / matching / gap-filling, listening played twice, two writing tasks
   with four bullet points and level word counts). It is NOT an official ECL
   exam or official ECL sample and is labelled "ECL-style Practice" in game.

     sourceType: 'ecl_style_practice'  · verified: false  (never 'official')
     explanation: written by the LETTERⁿ author (explanationSource:'author')

   Add content: push another task object into the right level / skill.
   Listening: `audio.src` (a real recording) is used when present; otherwise
   the script is read by the device's text-to-speech.
   Loaded only when the ECL screen is opened (js/ql2/ecl.js).
   --------------------------------------------------------------------------- */
window.ECL_LIBRARY = (function(){
  const META = { organization:'ECL', sourceType:'ecl_style_practice', sourceName:'LETTERⁿ original practice (ECL-style format)',
    formatSource:'https://eclexam.eu/proba/', verified:false, explanationSource:'author' };
  const mc = (id, prompt, choices, correctAnswer, explanation, extra) => Object.assign({ id, type:'multiple_choice', prompt, choices, correctAnswer, explanation }, extra||{});
  const task = o => Object.assign({}, META, o);

  const L = { A2:{ reading:[], listening:[], writing:[] }, B1:{ reading:[], listening:[], writing:[] }, B2:{ reading:[], listening:[], writing:[] }, C1:{ reading:[], listening:[], writing:[] } };

  /* =========================================================== A2 */
  L.A2.reading.push(task({
    id:'ecl-a2-reading-01', level:'A2', skill:'reading', title:'The Lost Letter', th:'จดหมายที่หายไป',
    brief:'Read Anna\'s story. Find the information hidden inside.',
    passageTitle:'The Lost Letter',
    passage:[
      'Last Saturday, Anna went to her grandmother\'s old house in a small village by the sea. Her grandmother moved to the city ten years ago, but the family still visits the house every summer.',
      'Anna wanted to find an old photo album for her grandmother\'s birthday. She looked in the kitchen and in the living room, but she could not find it. Then she went up to the small room under the roof. It was dark and dusty, and there were boxes everywhere.',
      'In the third box, under some old blankets, Anna found the album. When she opened it, a letter fell out. It was yellow and very old. The letter was from a young man called Peter, and it was for her grandmother. It said: "I am sorry I cannot come to the station on Friday. I must work on my father\'s boat. Please wait for me at the lighthouse on Sunday."',
      'Anna was very surprised. Her grandfather\'s name was not Peter — it was Jonas. She put the letter in her bag and took the bus back to the city.',
      'At the birthday party, Anna gave her grandmother the album and the letter. Her grandmother laughed. "Peter was my first love," she said. "But on Sunday it rained all day, and I met your grandfather at the café instead!" Everybody laughed, and her grandmother kept the letter in her handbag all evening.'
    ],
    keyWords:['village','album','dusty','blanket','lighthouse','surprised'],
    rooms:[{ key:'goblin', n:3 },{ key:'shroom', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','Where is the grandmother\'s old house?',['In the city','In a village by the sea','Next to a station'],'B','Evidence: "her grandmother\'s old house in a small village by the sea."'),
      mc('q02','Why did Anna go to the house?',['To clean the kitchen','To find a photo album','To visit her grandmother'],'B','Evidence: "Anna wanted to find an old photo album for her grandmother\'s birthday."'),
      mc('q03','Where did Anna find the album?',['In the living room','In the kitchen','In a room under the roof'],'C','Evidence: "she went up to the small room under the roof… In the third box… Anna found the album."'),
      mc('q04','What was on top of the album in the box?',['Some old blankets','Some photos','A yellow bag'],'A','Evidence: "In the third box, under some old blankets, Anna found the album."'),
      mc('q05','Who wrote the letter?',['Anna\'s grandfather','A young man called Peter','Anna\'s grandmother'],'B','Evidence: "The letter was from a young man called Peter."'),
      mc('q06','Why could Peter not go to the station?',['He was ill.','He had to work on a boat.','He missed the bus.'],'B','Evidence: "I must work on my father\'s boat."'),
      mc('q07','Where did Peter want to meet on Sunday?',['At the lighthouse','At the café','At the station'],'A','Evidence: "Please wait for me at the lighthouse on Sunday."'),
      mc('q08','What was the name of Anna\'s grandfather?',['Peter','Jonas','Anna does not know.'],'B','Evidence: "Her grandfather\'s name was not Peter — it was Jonas."'),
      mc('q09','How did Anna travel back to the city?',['By car','By train','By bus'],'C','Evidence: "took the bus back to the city."'),
      mc('q10','What happened on that Sunday, many years ago?',['The grandmother met Peter at the lighthouse.','It rained and she met Jonas at a café.','Peter came to the station.'],'B','Evidence: "on Sunday it rained all day, and I met your grandfather at the café instead!"'),
    ],
  }));
  L.A2.reading.push(task({
    id:'ecl-a2-reading-02', level:'A2', skill:'reading', title:'Weekend Classes', th:'คอร์สวันหยุด',
    brief:'Four adverts are on the town notice board. Match each question to the right advert.',
    passageTitle:'Notice board — Weekend Classes',
    passage:[
      'A — COOKING CLUB. Learn to make bread, pizza and easy cakes. Every Saturday, 10:00–12:00, at the Community Centre. £8 per class. Bring an apron. Children under 12 must come with an adult.',
      'B — SWIMMING FOR BEGINNERS. Afraid of water? Our friendly teachers can help. Sundays, 9:00–10:00, at the Sports Hall pool. First class free! Then £5. Ages 6 and up.',
      'C — GUITAR GROUP. Play songs together in a small group (max. 6 people). Saturday afternoons, 15:00–16:30, in the music room of the library. You need your own guitar. £10 per class. Adults only.',
      'D — NATURE WALKS. Discover birds and plants in Green Park. Sunday mornings, 8:00–11:00. Free for everyone! Wear good shoes and bring water. Meet at the park gate. Dogs are welcome.'
    ],
    keyWords:['beginner','apron','afraid','discover','welcome'],
    options:['A — Cooking Club','B — Swimming','C — Guitar Group','D — Nature Walks'],
    rooms:[{ key:'goblin', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      { id:'q01', type:'matching', prompt:'Which class is always free?', correctAnswer:'D', explanation:'D: "Free for everyone!"' },
      { id:'q02', type:'matching', prompt:'Which class is only for adults?', correctAnswer:'C', explanation:'C: "Adults only."' },
      { id:'q03', type:'matching', prompt:'At which class is the first lesson free?', correctAnswer:'B', explanation:'B: "First class free! Then £5."' },
      { id:'q04', type:'matching', prompt:'Where do you need to bring your own instrument?', correctAnswer:'C', explanation:'C: "You need your own guitar."' },
      { id:'q05', type:'matching', prompt:'Which class can you take your dog to?', correctAnswer:'D', explanation:'D: "Dogs are welcome."' },
      { id:'q06', type:'matching', prompt:'Which class takes place at the library?', correctAnswer:'C', explanation:'C: "in the music room of the library."' },
      { id:'q07', type:'matching', prompt:'Which class is the longest?', correctAnswer:'D', explanation:'D: 8:00–11:00 = 3 hours (A = 2 h, B = 1 h, C = 1.5 h).' },
      { id:'q08', type:'matching', prompt:'Where must young children come with an adult?', correctAnswer:'A', explanation:'A: "Children under 12 must come with an adult."' },
      { id:'q09', type:'matching', prompt:'Which class is good for people who are afraid of water?', correctAnswer:'B', explanation:'B: "Afraid of water? Our friendly teachers can help."' },
      { id:'q10', type:'matching', prompt:'Which class tells you to bring something to drink?', correctAnswer:'D', explanation:'D: "bring water."' },
    ],
  }));
  L.A2.listening.push(task({
    id:'ecl-a2-listening-01', level:'A2', skill:'listening', title:'Tourist Information', th:'ศูนย์ข้อมูลนักท่องเที่ยว',
    brief:'A tourist asks for help at a tourist information office. Listen and answer.',
    plays:2,
    audio:{ src:null, voice:'en-GB', lines:[
      ['A','Good morning. Can I help you?'],
      ['B','Yes, please. I\'m here for three days and I\'d like to visit the castle. Is it far?'],
      ['A','Not really. It\'s about twenty minutes on foot, or you can take bus number seven from the main square.'],
      ['B','Great. When is it open?'],
      ['A','Every day from nine to five, but on Mondays it closes at one o\'clock.'],
      ['B','Oh, today is Monday! How much is a ticket?'],
      ['A','Twelve euros for adults, and students pay half price. Do you have a student card?'],
      ['B','Yes, I do. Is there a good place to eat near the castle?'],
      ['A','There\'s a small restaurant called The Blue Door. The fish soup is very good, but it\'s closed on Tuesdays.'],
      ['B','Thank you. And can I get a map of the city here?'],
      ['A','Of course. Here you are. It\'s free. And this evening there\'s a concert in the park at eight. It\'s free too.'],
      ['B','Wonderful! Thank you very much.'],
    ]},
    keyWords:['castle','square','ticket','half price','concert'],
    rooms:[{ key:'goblin', n:3 },{ key:'shroom', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','How long is the tourist staying?',['Two days','Three days','A week'],'B','Speaker B: "I\'m here for three days."'),
      mc('q02','Where does the tourist want to go?',['To the castle','To the beach','To a museum'],'A','Speaker B: "I\'d like to visit the castle."'),
      mc('q03','How long does it take to walk to the castle?',['About ten minutes','About twenty minutes','About an hour'],'B','"It\'s about twenty minutes on foot."'),
      mc('q04','Which bus goes to the castle?',['Number seven','Number eleven','Number seventeen'],'A','"take bus number seven from the main square."'),
      mc('q05','What time does the castle close today?',['At one o\'clock','At five o\'clock','At nine o\'clock'],'A','"on Mondays it closes at one o\'clock" — and "today is Monday".'),
      mc('q06','How much will the tourist pay for a ticket?',['Twelve euros','Six euros','Nothing'],'B','Adults pay twelve, "students pay half price", and the tourist has a student card → six euros.'),
      mc('q07','What is good at The Blue Door?',['The fish soup','The pizza','The cakes'],'A','"The fish soup is very good."'),
      mc('q08','When is The Blue Door closed?',['On Mondays','On Tuesdays','On Sundays'],'B','"it\'s closed on Tuesdays."'),
      mc('q09','How much is the city map?',['One euro','Two euros','It is free.'],'C','"Here you are. It\'s free."'),
      mc('q10','What is happening in the park this evening?',['A market','A concert','A football match'],'B','"this evening there\'s a concert in the park at eight."'),
    ],
  }));
  L.A2.writing.push(task({
    id:'ecl-a2-writing-01', level:'A2', skill:'writing', title:'A New Home', th:'บ้านใหม่',
    situation:'You have just moved to a new flat. Write an email to your friend Sam.',
    bullets:['Where is your new flat?','Describe one room you like.','What is near the flat?','Invite Sam to visit — say when.'],
    words:50, minutes:17, keyWords:['flat','balcony','near','invite'],
  }));
  L.A2.writing.push(task({
    id:'ecl-a2-writing-02', level:'A2', skill:'writing', title:'Party Tonight', th:'ปาร์ตี้คืนนี้',
    situation:'You are having a birthday party at home on Saturday. Write a note to your neighbour.',
    bullets:['Say why you are writing.','When does the party start and end?','Say sorry for the noise.','Invite your neighbour to come.'],
    words:50, minutes:17, keyWords:['neighbour','noise','sorry','invite'],
  }));

  /* =========================================================== B1 */
  L.B1.reading.push(task({
    id:'ecl-b1-reading-01', level:'B1', skill:'reading', title:'A Year Without a Phone', th:'หนึ่งปีที่ไม่มีโทรศัพท์',
    brief:'Read the magazine article and answer the questions.',
    passageTitle:'A Year Without a Phone',
    passage:[
      'When Daniel Ortiz, a 24-year-old engineering student, broke his smartphone in January, he decided not to buy a new one. "At first it was just an experiment for one month," he explains. "But I liked it so much that I kept going for a whole year."',
      'The first weeks were not easy. Daniel often reached into his pocket for a phone that was not there, and he missed several parties because his friends forgot to tell him about them. "People don\'t send invitations anymore," he laughs. "They just add you to a group chat."',
      'To solve the problem, he bought a cheap old-fashioned mobile that could only make calls and send text messages. He also started using a paper diary again and wrote down every meeting and deadline. His mother was delighted; she had given him the same diary three years earlier and he had never used it.',
      'Soon Daniel noticed some surprising changes. He was sleeping better because he no longer looked at a screen in bed. On the bus he read books instead of scrolling, and he finished eleven novels during the year. His marks at university also improved, especially in the subjects he used to find boring.',
      'There were difficult moments too. Without maps on his phone, he got lost twice in a city he did not know, and once he had to ask a stranger to call a taxi for him. "That was embarrassing," he admits, "but the man was very kind."',
      'Now the year is over, and Daniel has a smartphone again — but he uses it differently. He has deleted all social media apps and keeps the phone in another room at night. "I don\'t think everybody should give up their phone," he says. "But everybody should know that it\'s possible."'
    ],
    keyWords:['experiment','invitation','deadline','delighted','embarrassing','stranger'],
    rooms:[{ key:'goblin', n:3 },{ key:'shroom', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','Why did Daniel stop using a smartphone?',['His parents asked him to.','His phone broke and he chose not to replace it.','His university did not allow phones.'],'B','"broke his smartphone in January, he decided not to buy a new one."'),
      mc('q02','How long did Daniel first plan to live without a smartphone?',['One month','Three months','One year'],'A','"At first it was just an experiment for one month."'),
      mc('q03','Why did he miss some parties?',['He was too busy studying.','His friends forgot to tell him.','He did not want to go.'],'B','"he missed several parties because his friends forgot to tell him about them."'),
      mc('q04','What could Daniel\'s new mobile do?',['Only make calls and send texts','Take photos and show maps','Use group chats'],'A','"could only make calls and send text messages."'),
      mc('q05','Why was his mother happy?',['He called her more often.','He finally used the diary she had given him.','He bought a cheap phone.'],'B','"she had given him the same diary three years earlier and he had never used it."'),
      mc('q06','Why did Daniel sleep better?',['He went to bed earlier.','He stopped looking at a screen in bed.','He stopped drinking coffee.'],'B','"because he no longer looked at a screen in bed."'),
      mc('q07','What did he do on the bus?',['He read books.','He slept.','He studied for exams.'],'A','"On the bus he read books instead of scrolling."'),
      mc('q08','Which marks improved the most?',['In subjects he already loved','In subjects he used to find boring','In engineering only'],'B','"especially in the subjects he used to find boring."'),
      mc('q09','Why was one moment "embarrassing" for Daniel?',['He forgot a friend\'s birthday.','He had to ask a stranger to call a taxi.','He lost his diary.'],'B','"once he had to ask a stranger to call a taxi for him. \'That was embarrassing\'."'),
      mc('q10','What does Daniel think now?',['Everybody should give up their phone.','People should know they can live without one.','Smartphones are dangerous.'],'B','"I don\'t think everybody should give up their phone… But everybody should know that it\'s possible."'),
    ],
  }));
  L.B1.reading.push(task({
    id:'ecl-b1-reading-02', level:'B1', skill:'reading', title:'The Community Garden', th:'สวนชุมชน',
    brief:'Choose the best word for each gap in the text.',
    passageTitle:'The Community Garden',
    passage:[
      'Five years ago, the empty space behind our block of flats was full of rubbish. Today it is a garden (1) ___ more than forty families grow vegetables, herbs and flowers.',
      'The idea came (2) ___ a retired teacher, Mrs Patel, who was tired of looking at broken bottles from her window. She asked the city council for permission, and (3) ___ a few weeks the first volunteers were clearing the ground.',
      'At first, many neighbours were not (4) ___ in the project. "They thought it was a waste of time," Mrs Patel remembers. But when the first tomatoes appeared, people started to (5) ___ questions and offer help.',
      'Now every family has its own small piece of land, and there are also shared areas (6) ___ everyone can pick fruit. The garden has become a meeting place, too. On summer evenings, people (7) ___ food together and children play between the beds.',
      'The project has not always been easy. Two years ago, a storm (8) ___ the greenhouse, and the gardeners had to raise money to build a new one. They organised a market and sold their own jam and honey. "We collected (9) ___ money in one weekend," says Mrs Patel proudly.',
      'Other neighbourhoods have visited the garden to learn how to start their own. Mrs Patel\'s advice is simple: "Don\'t wait for (10) ___ else to do it. Start small, and people will join you."'
    ],
    keyWords:['rubbish','retired','permission','volunteer','greenhouse','proudly'],
    rooms:[{ key:'goblin', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','Gap (1)',['which','where','what'],'B','A place → "where": a garden where families grow vegetables.',{ type:'gap_fill' }),
      mc('q02','Gap (2)',['from','by','with'],'A','"The idea came from" someone.',{ type:'gap_fill' }),
      mc('q03','Gap (3)',['during','within','since'],'B','"within a few weeks" = in less than a few weeks.',{ type:'gap_fill' }),
      mc('q04','Gap (4)',['interesting','interest','interested'],'C','People are "interested in" something (-ed adjective for feelings).',{ type:'gap_fill' }),
      mc('q05','Gap (5)',['ask','make','do'],'A','The collocation is "ask questions".',{ type:'gap_fill' }),
      mc('q06','Gap (6)',['when','where','who'],'B','Shared areas (places) → "where everyone can pick fruit".',{ type:'gap_fill' }),
      mc('q07','Gap (7)',['share','divide','borrow'],'A','"share food together" — eat it with each other.',{ type:'gap_fill' }),
      mc('q08','Gap (8)',['destroyed','destroying','destroys'],'A','Past event ("Two years ago") → past simple "destroyed".',{ type:'gap_fill' }),
      mc('q09','Gap (9)',['enough','plenty','many'],'A','"enough money" — the right amount. "plenty" needs "of"; "many" is for countable nouns.',{ type:'gap_fill' }),
      mc('q10','Gap (10)',['anybody','somebody','nobody'],'B','"Don\'t wait for somebody else to do it."',{ type:'gap_fill' }),
    ],
  }));
  L.B1.listening.push(task({
    id:'ecl-b1-listening-01', level:'B1', skill:'listening', title:'Weekend Volunteers', th:'อาสาสมัครวันหยุด',
    brief:'A radio presenter talks to Lucy, who organises volunteers at an animal shelter.',
    plays:2,
    audio:{ src:null, voice:'en-GB', lines:[
      ['A','Welcome back to City Weekend. With me today is Lucy Brown from Happy Paws animal shelter. Lucy, what exactly do your volunteers do?'],
      ['B','Well, most of them come to walk the dogs. We have about sixty dogs at the moment, and they all need two walks a day. Some volunteers also help us clean, and a few work in our charity shop in the town centre.'],
      ['A','Do volunteers need any experience with animals?'],
      ['B','Not at all. Everybody does a two-hour training session on their first Saturday. We teach them how to hold the lead and what to do if a dog is frightened.'],
      ['A','How old do you have to be?'],
      ['B','Sixteen. Younger people can come with a parent, but they can\'t walk the bigger dogs.'],
      ['A','And how much time do people usually give?'],
      ['B','We ask for at least one morning a month. Of course, many people come every week. One of our volunteers, Mr Green, is eighty-one and he has come every Sunday for nine years!'],
      ['A','That\'s amazing. What\'s the best part of the job, for you?'],
      ['B','When a dog finds a new family. Last month eleven dogs went to new homes — that was our best month ever.'],
      ['A','And if listeners want to help, what should they do?'],
      ['B','The easiest way is to fill in the form on our website. Please don\'t just turn up at the gate, because we need to plan the training sessions.'],
    ]},
    keyWords:['shelter','lead','frightened','charity','turn up'],
    rooms:[{ key:'goblin', n:3 },{ key:'shroom', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','What do most volunteers do?',['Clean the shelter','Walk the dogs','Work in the shop'],'B','"most of them come to walk the dogs."'),
      mc('q02','How many walks does each dog need per day?',['One','Two','Three'],'B','"they all need two walks a day."'),
      mc('q03','Where is the charity shop?',['Next to the shelter','In the town centre','At the station'],'B','"our charity shop in the town centre."'),
      mc('q04','What happens on a volunteer\'s first Saturday?',['They meet the dogs\' owners.','They do a training session.','They fill in a form.'],'B','"Everybody does a two-hour training session on their first Saturday."'),
      mc('q05','What is the minimum age to volunteer alone?',['Fourteen','Sixteen','Eighteen'],'B','"Sixteen. Younger people can come with a parent."'),
      mc('q06','What can\'t younger volunteers do?',['Walk the bigger dogs','Clean the shelter','Come at weekends'],'A','"they can\'t walk the bigger dogs."'),
      mc('q07','How much time does the shelter ask for?',['One morning a week','One morning a month','One day a month'],'B','"We ask for at least one morning a month."'),
      mc('q08','What is special about Mr Green?',['He has volunteered every Sunday for nine years.','He started the shelter.','He has adopted eleven dogs.'],'A','"he has come every Sunday for nine years!"'),
      mc('q09','What happened last month?',['The shelter opened a new shop.','Eleven dogs found new homes.','Sixty new dogs arrived.'],'B','"Last month eleven dogs went to new homes."'),
      mc('q10','How should listeners offer to help?',['Go to the shelter gate','Phone the radio station','Fill in a form online'],'C','"fill in the form on our website. Please don\'t just turn up at the gate."'),
    ],
  }));
  L.B1.writing.push(task({
    id:'ecl-b1-writing-01', level:'B1', skill:'writing', title:'A Disappointing Stay', th:'ที่พักที่น่าผิดหวัง',
    situation:'You stayed at a hotel last weekend and you were not happy. Write an email to the hotel manager.',
    bullets:['When did you stay and for how long?','Describe two problems you had.','Explain how these problems affected your stay.','Say what you would like the hotel to do now.'],
    words:100, minutes:20, keyWords:['complain','disappointed','refund','apologise'],
  }));
  L.B1.writing.push(task({
    id:'ecl-b1-writing-02', level:'B1', skill:'writing', title:'Festival Blog', th:'บล็อกเทศกาล',
    situation:'You went to a local festival. Write a post for your blog.',
    bullets:['What festival was it and where?','Who did you go with?','Describe the best moment.','Would you recommend it? Why / why not?'],
    words:100, minutes:20, keyWords:['festival','crowd','recommend','atmosphere'],
  }));

  /* =========================================================== B2 */
  L.B2.reading.push(task({
    id:'ecl-b2-reading-01', level:'B2', skill:'reading', title:'The Night Shift Library', th:'ห้องสมุดกะกลางคืน',
    brief:'Read the article about a library that never closes, then answer the questions.',
    passageTitle:'The Library That Never Sleeps',
    passage:[
      'When the city library in Harwick announced that it would stay open twenty-four hours a day, many residents assumed it was a publicity stunt. Who, they asked, would want to borrow a book at three in the morning? Eighteen months later, the night shift has become one of the most successful experiments in the library\'s history.',
      'The idea did not come from the management but from a cleaner, Marta Silva, who had noticed people waiting outside the building in the early hours. "They were nurses finishing their shifts, taxi drivers on a break, students who couldn\'t concentrate at home," she recalls. "They weren\'t looking for books so much as a quiet, warm place to be."',
      'The library\'s director, Paul Okafor, admits he was sceptical. Opening at night would mean higher heating bills and extra staff, at a time when the budget was already under pressure. What convinced him was a two-week trial in which more than nine hundred people came through the doors between midnight and six. "The numbers were impossible to ignore," he says.',
      'To keep costs down, the library introduced self-service machines and asked volunteers to help at night. Only one paid librarian works the night shift, supported by a security guard. Some services, such as the children\'s section and the café, remain closed until the morning.',
      'Not everyone is convinced. Some local politicians argue that the money would be better spent on extending opening hours in smaller libraries on the edge of the city, where many families have no access at all after five o\'clock. Others worry about safety, although there has been only one minor incident since the scheme began.',
      'For the regular night visitors, however, the library has become something more than a building. One retired lorry driver who suffers from insomnia now runs a weekly reading group at two in the morning. "I used to lie awake staring at the ceiling," he says. "Now I have somewhere to go and people who expect me."'
    ],
    keyWords:['publicity stunt','sceptical','budget','convince','incident','insomnia'],
    rooms:[{ key:'shroom', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','How did many residents first react to the plan?',['They thought it was just a way to attract attention.','They asked to borrow more books.','They offered to work at night.'],'A','"many residents assumed it was a publicity stunt."'),
      mc('q02','Where did the idea come from?',['The library director','A cleaner at the library','A group of nurses'],'B','"The idea did not come from the management but from a cleaner, Marta Silva."'),
      mc('q03','According to Marta, what were the night visitors mainly looking for?',['Rare books','A quiet, warm place','Free internet'],'B','"They weren\'t looking for books so much as a quiet, warm place to be."'),
      mc('q04','Why did Paul Okafor have doubts at first?',['He worried about the extra costs.','He thought nobody would come.','He disliked working at night.'],'A','"higher heating bills and extra staff… the budget was already under pressure."'),
      mc('q05','What finally persuaded the director?',['A letter from the politicians','The results of a short trial','A survey of library members'],'B','"What convinced him was a two-week trial… more than nine hundred people."'),
      mc('q06','How does the library keep night-time costs low?',['It charges visitors a small fee.','It uses machines and volunteers.','It closes on weekends.'],'B','"introduced self-service machines and asked volunteers to help at night."'),
      mc('q07','Which service is NOT available at night?',['Borrowing books','The café','Security'],'B','"the children\'s section and the café, remain closed until the morning."'),
      mc('q08','What do some politicians suggest?',['Closing the library at midnight','Spending the money on smaller libraries','Hiring more security guards'],'B','"the money would be better spent on extending opening hours in smaller libraries."'),
      mc('q09','What does the article say about safety?',['There have been many problems.','There has been one small incident.','Nobody has mentioned safety.'],'B','"there has been only one minor incident since the scheme began."'),
      mc('q10','What has the library given the retired lorry driver?',['A job as a librarian','A place to go and a sense of being expected','A cure for his insomnia'],'B','"Now I have somewhere to go and people who expect me." (He still has insomnia.)'),
    ],
  }));
  L.B2.reading.push(task({
    id:'ecl-b2-reading-02', level:'B2', skill:'reading', title:'Working From Home', th:'ทำงานจากที่บ้าน',
    brief:'Four people talk about working from home. Which person says each thing?',
    passageTitle:'Working From Home — four opinions',
    passage:[
      'A — Hannah, graphic designer: "I expected to love it, and for the first few months I did. But slowly the line between work and the rest of my life disappeared. I\'d answer emails at eleven at night just because the laptop was on the kitchen table. In the end I rented a desk in a shared office two days a week, purely so that I\'d have somewhere to leave my work behind."',
      'B — Tomasz, software developer: "Honestly, my productivity went up. No commute means I gain almost two hours a day, and I use some of that time to go running. What I do miss is the informal learning — overhearing a colleague solve a problem, asking a quick question. Online, every question feels like an interruption, so junior people tend to struggle in silence."',
      'C — Ruth, team manager: "Managing people you can\'t see is a completely different skill. At first I checked on everyone far too often, and my team found it exhausting. Now I judge results rather than hours online. The surprising thing is that the quietest members of my team speak up more in video meetings, where they can use the chat."',
      'D — Kofi, sales representative: "My job depends on relationships, and you can\'t build trust with a client through a screen in the same way. I go back to the office three days a week because I need the energy of other people around me. Working from home suits some personalities, but I\'ve accepted that it isn\'t mine."'
    ],
    keyWords:['commute','productivity','interruption','exhausting','relationship','trust'],
    options:['A — Hannah','B — Tomasz','C — Ruth','D — Kofi'],
    rooms:[{ key:'shroom', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      { id:'q01', type:'matching', prompt:'Who now pays for a workplace outside the home?', correctAnswer:'A', explanation:'A: "I rented a desk in a shared office two days a week."' },
      { id:'q02', type:'matching', prompt:'Who says they get more done at home?', correctAnswer:'B', explanation:'B: "my productivity went up."' },
      { id:'q03', type:'matching', prompt:'Who changed how they evaluate other people\'s work?', correctAnswer:'C', explanation:'C: "Now I judge results rather than hours online."' },
      { id:'q04', type:'matching', prompt:'Who says personal contact is essential for their job?', correctAnswer:'D', explanation:'D: "My job depends on relationships… you can\'t build trust… through a screen."' },
      { id:'q05', type:'matching', prompt:'Who worries about less experienced colleagues?', correctAnswer:'B', explanation:'B: "junior people tend to struggle in silence."' },
      { id:'q06', type:'matching', prompt:'Who found it hard to stop working in the evening?', correctAnswer:'A', explanation:'A: "I\'d answer emails at eleven at night."' },
      { id:'q07', type:'matching', prompt:'Who noticed something unexpected about shy colleagues?', correctAnswer:'C', explanation:'C: "the quietest members of my team speak up more in video meetings."' },
      { id:'q08', type:'matching', prompt:'Who uses the time saved for exercise?', correctAnswer:'B', explanation:'B: "I use some of that time to go running."' },
      { id:'q09', type:'matching', prompt:'Who admits making a mistake at the beginning?', correctAnswer:'C', explanation:'C: "At first I checked on everyone far too often."' },
      { id:'q10', type:'matching', prompt:'Who believes home working depends on your character?', correctAnswer:'D', explanation:'D: "Working from home suits some personalities… it isn\'t mine."' },
    ],
  }));
  L.B2.listening.push(task({
    id:'ecl-b2-listening-01', level:'B2', skill:'listening', title:'Sleep and Memory', th:'การนอนกับความจำ',
    brief:'A podcast host interviews a sleep researcher. Listen and answer the questions.',
    plays:2,
    audio:{ src:null, voice:'en-GB', lines:[
      ['A','Today on Mind Matters I\'m talking to Dr Elena Novak, who studies sleep and memory. Elena, is it true that we learn while we sleep?'],
      ['B','Not in the sense that you can play a recording of French verbs at night and wake up fluent — that idea has been tested many times and it simply doesn\'t work. What sleep does is strengthen things we learned during the day. The brain replays new information and moves it into long-term memory.'],
      ['A','So a student who stays up all night before an exam is making a mistake?'],
      ['B','A serious one. In one of our studies, students who slept after learning a list of words remembered about forty per cent more the next day than students who stayed awake. And the effect was strongest for the material they had found most difficult.'],
      ['A','Does it matter when we sleep, or only how long?'],
      ['B','Both. The deep sleep that helps us store facts happens mostly in the first half of the night, while the dream stage, which seems to help with creativity and emotional memories, is more common towards the morning. So if you cut your sleep short by getting up very early, you lose a lot of that second stage.'],
      ['A','What about naps?'],
      ['B','Short naps can be surprisingly useful. Even twenty minutes in the afternoon improved performance in our memory tests. But longer naps can leave people feeling heavy and confused, and they may make it harder to fall asleep at night.'],
      ['A','Finally, what\'s your advice for our listeners?'],
      ['B','Treat sleep as part of learning, not as time taken away from it. And try to keep regular hours, even at weekends. Our bodies like routine much more than we like to admit.'],
    ]},
    keyWords:['fluent','long-term memory','performance','routine','creativity'],
    rooms:[{ key:'shroom', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','What does Dr Novak say about playing recordings during sleep?',['It works for vocabulary only.','Research shows it does not work.','It has never been tested.'],'B','"that idea has been tested many times and it simply doesn\'t work."'),
      mc('q02','According to Dr Novak, what does sleep do for learning?',['It strengthens what we learned during the day.','It helps us learn new languages faster.','It replaces the need to revise.'],'A','"What sleep does is strengthen things we learned during the day."'),
      mc('q03','How did students who slept after learning perform?',['About the same as others','About forty per cent better','Twice as well'],'B','"remembered about forty per cent more the next day."'),
      mc('q04','Which material benefited most from sleep?',['The easiest material','The most difficult material','Material learned in the morning'],'B','"the effect was strongest for the material they had found most difficult."'),
      mc('q05','When does most of the deep sleep happen?',['In the first half of the night','Just before waking up','During afternoon naps'],'A','"The deep sleep… happens mostly in the first half of the night."'),
      mc('q06','What does the dream stage seem to help with?',['Remembering facts','Creativity and emotional memories','Physical recovery'],'B','"the dream stage, which seems to help with creativity and emotional memories."'),
      mc('q07','What happens if you get up very early?',['You lose much of the dream stage.','You lose most of your deep sleep.','Nothing changes.'],'A','The dream stage is "more common towards the morning", so cutting sleep short loses "that second stage".'),
      mc('q08','How long was the useful nap in their tests?',['Five minutes','Twenty minutes','Two hours'],'B','"Even twenty minutes in the afternoon improved performance."'),
      mc('q09','What problem can longer naps cause?',['Headaches the next day','Difficulty sleeping at night','Losing long-term memories'],'B','"they may make it harder to fall asleep at night."'),
      mc('q10','What is Dr Novak\'s final advice?',['Sleep longer at weekends','Keep regular sleeping hours','Study late at night'],'B','"try to keep regular hours, even at weekends."'),
    ],
  }));
  L.B2.writing.push(task({
    id:'ecl-b2-writing-01', level:'B2', skill:'writing', title:'A Car-Free Centre', th:'ใจกลางเมืองปลอดรถ',
    situation:'Your city plans to close the city centre to cars. Write a letter to the editor of the local newspaper.',
    bullets:['Say why you are writing.','Give one advantage of the plan.','Explain one problem it could cause for some people.','Suggest how the city could solve that problem.'],
    words:150, minutes:30, keyWords:['pollution','pedestrian','public transport','residents'],
  }));
  L.B2.writing.push(task({
    id:'ecl-b2-writing-02', level:'B2', skill:'writing', title:'Course Report', th:'รายงานหลักสูตร',
    situation:'Your company sent you on a three-day training course. Write a short report for your manager.',
    bullets:['What was the course about?','Which part was the most useful and why?','What could be improved?','Should other employees attend? Give reasons.'],
    words:150, minutes:30, keyWords:['training','useful','improve','recommend'],
  }));

  /* =========================================================== C1 */
  L.C1.reading.push(task({
    id:'ecl-c1-reading-01', level:'C1', skill:'reading', title:'The Myth of Multitasking', th:'มายาคติของการทำหลายอย่างพร้อมกัน',
    brief:'Read the article and choose the answer that best reflects the text.',
    passageTitle:'The Myth of Multitasking',
    passage:[
      'Ask a room full of professionals whether they are good at multitasking and most hands will go up. Ask them to prove it, and the results are rather less flattering. A growing body of research suggests that what we call multitasking is, for the vast majority of people, nothing more than rapid switching between tasks — and that every switch carries a hidden cost.',
      'The problem lies in what psychologists term "attention residue". When we move from one task to another, part of our mind remains stuck on the first, particularly if it was left unfinished. In one frequently cited experiment, participants who were interrupted in the middle of a puzzle performed noticeably worse on a subsequent reading task than those who had been allowed to complete it, even though the second task was entirely unrelated.',
      'Paradoxically, those who multitask most often appear to be the worst at it. Heavy media multitaskers — people who habitually watch television while messaging and browsing — were found in several studies to be more easily distracted by irrelevant information, not less. Practice, it seems, does not make perfect; it may simply make us more comfortable with being scattered.',
      'None of this means that doing two things at once is always impossible. Activities that have become automatic, such as walking or folding laundry, can be combined with conversation without much difficulty. The trouble begins when two tasks compete for the same mental resources, as when we attempt to write an email while following a meeting.',
      'Some organisations have begun to respond. A number of firms now designate "deep work" mornings, during which internal meetings and messages are discouraged. Early reports are encouraging, although critics point out that such policies tend to benefit employees whose roles involve long, concentrated tasks, while those in customer-facing positions can hardly ignore incoming requests.',
      'Perhaps the most valuable lesson is a modest one. Rather than trying to become better multitaskers, we might accept our limits and arrange our days accordingly — grouping similar tasks, closing unnecessary windows and, occasionally, allowing ourselves the unfashionable luxury of doing one thing at a time.'
    ],
    keyWords:['flattering','residue','subsequent','paradoxically','designate','accordingly'],
    rooms:[{ key:'wolf', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','What does the writer suggest about professionals\' views of their own multitasking?',['They are usually accurate.','They tend to overestimate their ability.','They rarely think about it.'],'B','Most hands go up, but when asked to prove it "the results are rather less flattering."'),
      mc('q02','According to the article, what is multitasking for most people?',['Doing several tasks truly at the same time','Switching quickly from one task to another','A skill that improves with age'],'B','"nothing more than rapid switching between tasks."'),
      mc('q03','"Attention residue" refers to…',['part of our attention remaining on a previous task.','the tiredness caused by long tasks.','information we forget after an interruption.'],'A','"part of our mind remains stuck on the first."'),
      mc('q04','What did the puzzle experiment show?',['Unfinished tasks harmed performance on a later, unrelated task.','Puzzles improve reading skills.','Interruptions only matter when tasks are related.'],'A','Interrupted participants "performed noticeably worse on a subsequent reading task… entirely unrelated."'),
      mc('q05','What was found about heavy media multitaskers?',['They filter out distractions better.','They are more easily distracted.','They read faster than others.'],'B','"more easily distracted by irrelevant information, not less."'),
      mc('q06','The phrase "Practice… does not make perfect" suggests that frequent multitasking…',['makes people more skilled.','may only make people used to being unfocused.','has no effect at all.'],'B','"it may simply make us more comfortable with being scattered."'),
      mc('q07','When can two activities be combined without much difficulty?',['When one of them is automatic','When both need careful thought','When they are done in the morning'],'A','"Activities that have become automatic… can be combined with conversation."'),
      mc('q08','What is a "deep work" morning?',['A time with fewer meetings and messages','A training session on concentration','A morning without any work'],'A','"internal meetings and messages are discouraged."'),
      mc('q09','What criticism of such policies is mentioned?',['They are too expensive.','They do not suit staff who must respond to customers.','They reduce productivity.'],'B','"those in customer-facing positions can hardly ignore incoming requests."'),
      mc('q10','What is the writer\'s overall conclusion?',['We should train harder to multitask.','We should organise our work around our limitations.','Technology will solve the problem.'],'B','"accept our limits and arrange our days accordingly."'),
    ],
  }));
  L.C1.reading.push(task({
    id:'ecl-c1-reading-02', level:'C1', skill:'reading', title:'Slow Travel', th:'การเดินทางแบบช้า',
    brief:'Choose the word or phrase that best fits each gap.',
    passageTitle:'In Praise of Slow Travel',
    passage:[
      'For decades, the measure of a good holiday was how much ground it (1) ___. Ten countries in fourteen days, three cities in a long weekend: the itinerary itself became a kind of trophy. Lately, however, a growing number of travellers have begun to (2) ___ this approach in favour of what has come to be known as "slow travel".',
      'The principle is straightforward. Instead of rushing between famous sights, slow travellers stay in one place for an extended period, (3) ___ trains to planes and local guesthouses to international hotel chains. The aim is not to see everything but to (4) ___ a genuine sense of a place and its rhythms.',
      'Advocates argue that the benefits are considerable. Longer stays tend to (5) ___ the money spent locally, and travelling overland produces a fraction of the emissions of short-haul flights. There is also, they claim, a psychological reward: freed from a packed schedule, visitors are more (6) ___ to notice the small details that make a place memorable.',
      'Critics, (7) ___, see the trend as something of a luxury. Not everyone can take several weeks off work, and for families with limited holidays the choice between a fast trip and no trip at all is hardly a choice. Others suspect that slow travel is (8) ___ a marketing label, attached to expensive packages that differ little from conventional tourism.',
      'Both points have some (9) ___. Yet the underlying idea need not depend on long holidays. Even a weekend away can be approached slowly — by doing less, walking more and resisting the urge to photograph everything. In the end, slow travel may be (10) ___ a matter of attitude than of time.'
    ],
    keyWords:['itinerary','advocate','emissions','straightforward','conventional','attitude'],
    rooms:[{ key:'wolf', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','Gap (1)',['covered','crossed','reached'],'A','"cover ground" = travel a distance / see a lot.',{ type:'gap_fill' }),
      mc('q02','Gap (2)',['abandon','resign','refuse'],'A','"abandon an approach in favour of" another one.',{ type:'gap_fill' }),
      mc('q03','Gap (3)',['choosing','preferring','selecting'],'B','The pattern is "prefer X to Y": preferring trains to planes.',{ type:'gap_fill' }),
      mc('q04','Gap (4)',['gain','win','earn'],'A','"gain a sense of" something.',{ type:'gap_fill' }),
      mc('q05','Gap (5)',['rise','increase','arise'],'B','A verb with an object is needed: "increase the money spent locally". "rise" and "arise" cannot take an object.',{ type:'gap_fill' }),
      mc('q06','Gap (6)',['probable','likely','possible'],'B','"be likely to do something"; "probable" and "possible" don\'t take "to + verb" with a person as subject.',{ type:'gap_fill' }),
      mc('q07','Gap (7)',['however','therefore','moreover'],'A','Contrast with the advocates\' view → "however".',{ type:'gap_fill' }),
      mc('q08','Gap (8)',['nothing more than','no less than','anything but'],'A','The critics think it is only a label → "nothing more than".',{ type:'gap_fill' }),
      mc('q09','Gap (9)',['merit','value','worth'],'A','The fixed phrase is "have some merit" = be partly right.',{ type:'gap_fill' }),
      mc('q10','Gap (10)',['more','rather','further'],'A','"more a matter of attitude than of time" (more … than).',{ type:'gap_fill' }),
    ],
  }));
  L.C1.listening.push(task({
    id:'ecl-c1-listening-01', level:'C1', skill:'listening', title:'Urban Heat Islands', th:'เกาะความร้อนในเมือง',
    brief:'You will hear part of a lecture about heat in cities. Listen and answer the questions.',
    plays:2,
    audio:{ src:null, voice:'en-GB', lines:[
      ['A','Good afternoon. Today I want to look at a phenomenon that affects almost every large city: the urban heat island. Put simply, cities tend to be warmer than the surrounding countryside — sometimes by as much as seven degrees on a summer evening.'],
      ['A','Why should that be? There are several factors. Dark surfaces such as asphalt roads and roofs absorb heat during the day and release it slowly at night. Tall buildings trap that heat and reduce wind. And human activity — traffic, air conditioning, industry — adds heat of its own. Interestingly, the difference between city and countryside is usually greatest not at midday but after sunset, when the countryside cools quickly and the city does not.'],
      ['A','The consequences are not merely a matter of comfort. During heatwaves, death rates in cities rise sharply, particularly among elderly people living alone. Higher temperatures also increase demand for air conditioning, which in turn uses more energy and, ironically, releases even more heat into the streets.'],
      ['A','So what can be done? One of the cheapest measures is simply to change colours. Painting roofs white or light grey can reduce their surface temperature considerably. Trees are another obvious answer: a well-placed street tree provides shade and cools the air around it. However — and this is often overlooked — trees need water, space for their roots and years of care before they deliver real benefits. Planting thousands of young trees and then forgetting about them achieves very little.'],
      ['A','Some cities are going further. Paris has begun converting schoolyards into green spaces that open to the public during heatwaves, while Singapore requires new developments to replace any greenery lost on the ground with plants on roofs and walls.'],
      ['A','I\'d like to finish with a word of caution. No single measure will solve the problem, and solutions that work in one climate may fail in another. What matters is planning that treats heat as a long-term risk rather than an occasional summer inconvenience.'],
    ]},
    keyWords:['phenomenon','absorb','overlooked','consequence','caution','inconvenience'],
    rooms:[{ key:'wolf', n:3 },{ key:'wolf', n:3 },{ key:'treant', n:4, mini:true }],
    questions:[
      mc('q01','According to the lecturer, how much warmer can cities be?',['Up to about seven degrees','Up to about two degrees','Up to about fifteen degrees'],'A','"sometimes by as much as seven degrees on a summer evening."'),
      mc('q02','What do dark surfaces do?',['Reflect heat back into the sky','Absorb heat and release it slowly','Stay cool at night'],'B','"absorb heat during the day and release it slowly at night."'),
      mc('q03','When is the city–countryside difference usually greatest?',['At midday','After sunset','Early in the morning'],'B','"usually greatest not at midday but after sunset."'),
      mc('q04','Who is especially at risk during heatwaves?',['Young children in schools','Elderly people living alone','People working outdoors'],'B','"particularly among elderly people living alone."'),
      mc('q05','Why does the lecturer call air conditioning "ironic"?',['It is too expensive for most people.','It releases more heat into the streets.','It does not cool buildings well.'],'B','"which in turn uses more energy and, ironically, releases even more heat into the streets."'),
      mc('q06','What does the lecturer describe as one of the cheapest measures?',['Building taller buildings','Painting roofs in light colours','Reducing traffic'],'B','"One of the cheapest measures is simply to change colours… roofs white or light grey."'),
      mc('q07','What point about trees is "often overlooked"?',['They need long-term care to be effective.','They make streets darker.','They increase humidity too much.'],'A','"trees need water, space for their roots and years of care before they deliver real benefits."'),
      mc('q08','What has Paris started to do?',['Plant trees on every street','Turn schoolyards into public green spaces','Ban cars in summer'],'B','"converting schoolyards into green spaces that open to the public during heatwaves."'),
      mc('q09','What does Singapore require from new developments?',['Light-coloured walls','Replacing lost greenery on roofs and walls','Fewer air-conditioning units'],'B','"replace any greenery lost on the ground with plants on roofs and walls."'),
      mc('q10','What is the lecturer\'s final message?',['One measure can solve the problem everywhere.','Heat should be planned for as a long-term risk.','Cities should copy Singapore exactly.'],'B','"planning that treats heat as a long-term risk rather than an occasional summer inconvenience."'),
    ],
  }));
  L.C1.writing.push(task({
    id:'ecl-c1-writing-01', level:'C1', skill:'writing', title:'Screens or Classrooms?', th:'จอหรือห้องเรียน?',
    situation:'An education magazine has asked readers for articles on the topic "Can online learning replace the classroom?" Write your article.',
    bullets:['Describe how online learning has changed in recent years.','Discuss one clear advantage of learning online.','Discuss what classrooms offer that screens cannot.','Give and justify your own conclusion.'],
    words:200, minutes:37, keyWords:['flexibility','interaction','motivation','justify'],
  }));
  L.C1.writing.push(task({
    id:'ecl-c1-writing-02', level:'C1', skill:'writing', title:'The Four-Day Week', th:'สัปดาห์ทำงานสี่วัน',
    situation:'Your manager is considering a four-day working week. Write a formal proposal to your manager.',
    bullets:['Explain the purpose of the proposal.','Present two benefits for the company.','Identify a possible risk and how to reduce it.','Recommend a way to test the idea.'],
    words:200, minutes:37, keyWords:['proposal','productivity','pilot','implement'],
  }));

  return { version:1, levels:L, meta:META,
    levelInfo:{
      A2:{ en:'Foundation', th:'พื้นฐาน', col:'#5ee08a' },
      B1:{ en:'Intermediate', th:'ระดับกลาง', col:'#5ab8ff' },
      B2:{ en:'Upper Intermediate', th:'กลางค่อนสูง', col:'#c77dff' },
      C1:{ en:'Advanced', th:'ระดับสูง', col:'#ffd24a' },
    } };
})();
