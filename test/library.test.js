import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titleMetadata, episodeProgress, libraryStats, filterLibrary, pickWatchlist } from '../src/lib/library.js'

test('metadata handles film/TV fields and excludes season specials', () => {
  const tv = titleMetadata({first_air_date:'2020-01-02',genres:[{name:'Dramat'}],vote_average:8.3,number_of_episodes:4,last_episode_to_air:{runtime:45},seasons:[{season_number:0,episode_count:1},{season_number:1,episode_count:4}]},'tv')
  assert.equal(tv.episodeRuntime,45);assert.equal(tv.totalEpisodes,4);assert.deepEqual(tv.seasons,[{number:1,count:4}]);assert.equal(tv.year,'2020')
  assert.equal(titleMetadata({runtime:120},'movie').runtime,120)
})
test('progress finds the first unwatched episode across seasons, with duplicates and gaps', () => {
  const item={status:'watching',episodes:['1x1','1x1','1x3'],totalEpisodes:5,seasons:[{number:2,count:2},{number:1,count:3}]}
  assert.deepEqual(episodeProgress(item),{done:2,total:5,percent:40,next:'S1E2'})
  assert.deepEqual(episodeProgress({...item,status:'watched'}),{done:5,total:5,percent:100,next:null})
  assert.equal(episodeProgress({episodes:[]}).next,null)
})
test('stats count completed movies, whole series, partial series and missing durations honestly', () => {
  const stats=libraryStats([
    {mediaType:'movie',status:'watched',runtime:120,genres:['Dramat']},
    {mediaType:'movie',status:'watchlist',runtime:200},
    {mediaType:'tv',status:'watching',episodes:['1x1','1x2'],episodeRuntime:30,genres:['Dramat']},
    {mediaType:'tv',status:'watched',totalEpisodes:4,episodeRuntime:45,genres:['Komedia']},
    {mediaType:'movie',status:'watched'},
  ])
  assert.equal(stats.movies,2);assert.equal(stats.series,1);assert.equal(stats.episodes,6);assert.equal(stats.minutes,360);assert.equal(stats.missingRuntime,1);assert.deepEqual(stats.genres,[['Dramat',2],['Komedia',1]])
})
test('combined filters and rating/year/title/added-date sorting do not mutate the library', () => {
  const items=[{title:'Zulu',mediaType:'movie',status:'watched',year:'2020',genres:['Dramat'],tmdbRating:7,createdAt:'2025-01-01'}, {title:'Alpha',mediaType:'tv',status:'watching',year:'2022',genres:['Komedia'],tmdbRating:9,createdAt:'2024-01-01'}]
  assert.equal(filterLibrary(items,{query:' zU ',type:'movie',status:'watched',genre:'Dramat',year:'2020'}).length,1)
  for(const sort of ['rating','year','title']) assert.equal(filterLibrary(items,{sort})[0].title,'Alpha')
  assert.equal(filterLibrary(items,{} )[0].title,'Zulu');assert.equal(items[0].title,'Zulu')
  assert.equal(filterLibrary(items,{genre:'Horror'}).length,0)
})
test('random picker only draws watchlist, avoids the previous result and handles empty lists', () => {
  const items=[{tmdbId:1,mediaType:'movie',status:'watchlist'},{tmdbId:2,mediaType:'tv',status:'watchlist'},{tmdbId:3,status:'watched'}]
  assert.equal(pickWatchlist(items,'movie-1',()=>0).tmdbId,2)
  assert.equal(pickWatchlist([]),null)
  assert.equal(pickWatchlist([items[0]],'movie-1').tmdbId,1)
})
