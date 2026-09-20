// Display names for the special (non-drill) rooms: the four mini-games and
// the finale. Split out on its own since both the room builders and the
// map/UI labels need these names.
export function nimName(lang){ return lang==='sv' ? 'Räknemuren' : 'The Counting Wall'; }
export function comboName(lang){ return lang==='sv' ? 'Skattkammardörren' : 'The Treasury Door'; }
export function minigameName(mgType, lang){
  if(mgType==='nim') return nimName(lang);
  if(mgType==='mastermind') return lang==='sv' ? 'Master Mind-rummet' : 'The Master Mind Room';
  if(mgType==='guess') return lang==='sv' ? 'Gissa-rummet' : 'The Guessing Room';
  if(mgType==='minesweeper') return lang==='sv' ? 'Mumiefältet' : 'The Mummy Field';
  return '';
}
