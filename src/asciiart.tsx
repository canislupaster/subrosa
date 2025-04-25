import { useState } from "preact/hooks";
import { fill } from "../shared/util";
import { Collapse, Text, useAsyncEffect } from "./ui";

const chars = [["Q",38],["W",37],["B",36],["g",36],["M",35],["N",35],["R",35],["&",34],["@",33],["D",33],["H",33],["O",33],["K",32],["b",32],["m",32],["0",31],["G",31],["d",31],["p",31],["q",31],["8",30],["E",30],["U",30],["w",30],["6",29],["9",29],["A",29],["P",29],["S",29],["h",29],["k",29],["$",28],["X",28],["Z",28],["%",27],["4",27],["5",27],["V",27],["3",26],["I",26],["a",26],["j",26],["#",25],["2",25],["C",25],["F",25],["e",25],["n",25],["o",25],["J",24],["f",24],["u",24],["y",24],["s",23],["t",23],["z",23],["1",22],["T",22],["Y",22],["l",21],["x",21],["7",20],["L",20],["c",20],["{",20],["}",20],["[",19],["]",19],["i",19],["v",19],["|",19],["(",17],[")",17],["\"",16],["\\",16],["/",16],[";",16],["r",16],["*",15],["<",14],["=",14],[">",14],["!",13],["+",13],["^",13],[":",12],[",",10],["'",8],["~",8],["-",7],[".",6],["`",4],[" ",0]] as const;

const charMul = 100/Math.max(...chars.map(x=>x[1]));
const bestChar = fill(101, i=>{
	return chars[chars.reduce((ci,v,j)=>ci==-1
		|| Math.abs(v[1]*charMul-i) < Math.abs(chars[ci][1]*charMul-i) ? j : ci, -1)][0];
});

function rgb2hsv([r,g,b]: readonly [number, number, number]): [number, number, number] {
	const v: number=Math.max(r,g,b), c: number=v-Math.min(r,g,b);
	const h: number= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c));
	return [60*(h<0?h+6:h), v&&c/v, v];
}

const palette = (
	"#000000000000:#b7b7b8b89e9e:#9292cbcbafaf:#a6a6cbcb9e9e:#a4a4a7a7c3c3:#b7b7a7a7b2b2:#9292babac3c3:#e7e7e7e7e7e7:#808080808080:#dedef2f2eaea:#dedef2f2eaea:#dedef2f2eaea:#dedef2f2eaea:#dedef2f2eaea:#dedef2f2eaea:#ffffffffffff".split(":").map(x=>x.slice(0,7))
).map(x=>[
	rgb2hsv(
		[0,2,4].map(v=>(Number.parseInt(x.slice(v+2,v+3), 16) + 16*Number.parseInt(x.slice(v+1,v+2), 16))/255) as [number,number,number]
	),
	// `#${x.map(v=>`${Math.floor(v/16).toString(16)}${(v%16).toString(16)}`).join("")}`
	x
] as const);

type ImageProps = {
	src: string, contrast?: number, brightness?: number,
	saturation?: number, hue?: number, scale?: number, yScale?: number
};

const imagePropsKeys: (keyof ImageProps)[] = [
	"src", "contrast", "brightness", "hue", "scale", "yScale"
] as const;

async function loadImage({
	src, contrast, brightness, hue, scale, yScale, saturation
}: ImageProps) {
	const image = new Image();
	const prom = new Promise<void>((res,rej) => {
		image.onerror = ()=>rej(new Error(`Error loading image`));
		image.onload = ()=>res();
	});

	image.src = src;
	await prom;

	const sc = (scale ?? 120)/Math.max(image.height, image.width);
	const w = Math.ceil(image.width*sc), h=Math.ceil(image.height*sc*(yScale ?? 100)/250);
	const offscreen = new OffscreenCanvas(w,h);
	const ctx = offscreen.getContext("2d")!;
	ctx.drawImage(image,0,0,image.width,image.height,0,0,w,h);
	const data = ctx.getImageData(0,0,w,h);
	const arr: [number,number,number][] = [];
	for (let i=0; i<w*h*4; i+=4) {
		const hsv = rgb2hsv([...data.data.subarray(i, i+3).values().map(v=>v/255)] as [number,number,number]);
		hsv[2] *= data.data[i+3]/255;
		arr.push(hsv);
	}
	
	const sobel: number[] = [];
	const mat = fill(9, 0);
	for (let i=0; i<h; i++) for (let j=0; j<w; j++) {
		let mi=0;
		for (let di=-1; di<=1; di++) for (let dj=-1; dj<=1; dj++) {
			mat[mi++] = i+di>=0 && i+di<h && j+dj>=0 && j+dj<w ? arr[(i+di)*w + j+dj][2] : 0;
		}

		const dx = j>0 && j<w-1 ? [-1,0,1,-2,0,2,-1,0,1].reduce((a,v,i)=>a+mat[i]*v, 0) : 0;
		const dy = i>0 && i<h-1 ? [-1,-2,-1,0,0,0,1,2,1].reduce((a,v,i)=>a+mat[i]*v, 0) : 0;
		sobel.push(dx*dx + dy*dy);
	}

	const value = arr.map(v=>v[2]);
	const minV = Math.min(...value), maxV = Math.max(...value);
	const bias = (brightness ?? 0)/100-minV, mul = (contrast ?? 100)/(maxV - minV)/100;
	let out="<span>";
	let wi=0;
	let lastHex = "";
	let sobelI=0;
	for (const x of arr) {
		x[2] = Math.max(Math.min((x[2]+bias)*mul + sobel[sobelI++]*1.7-0.6,1),0);
		if (saturation!=null) x[1] *= saturation / 100;
		x[0] = (x[0]+(hue??0))%360;
		let bestScore = Number.MAX_SAFE_INTEGER, bestHex="";
		for (const [y, hex] of palette) {
			const d = (360+x[0]-y[0])%360;
			const score = (d>180 ? 360-d : d) + Math.abs(x[1]-y[1])*100 + Math.abs(x[2]-y[2])*10;
			if (score<bestScore) { [bestScore, bestHex] = [score,hex]; }
		}

		if (lastHex!=bestHex) {
			out+=`</span><span style="color: ${bestHex}; animation-delay: ${
				Math.floor(Math.random()*1000)}ms;" >`;
			lastHex=bestHex;
		}

		out+=bestChar[Math.round(x[2]*x[2]*100)];
		if (++wi==w) {out+=`</span>\n<span>`; wi=0;}
	}
	out+="</span>";
	
	return out;
}

export function AsciiArt(opts: ImageProps) {
	const [img, setImg] = useState<string|null>(null);
	useAsyncEffect(async ()=>{
		setImg(await loadImage(opts));
	}, [...imagePropsKeys.map(k=>opts[k])]);
	
		return <Collapse open init speed={0.6} >
		{img==null ? <Text v="dim" >...</Text>
			// eslint-disable-next-line react/no-danger
			: <pre className="contents asciiart" dangerouslySetInnerHTML={{__html: img}} />}
	</Collapse>;
}
