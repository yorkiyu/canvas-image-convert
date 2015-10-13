function ConvertImage(opts){
	var defaults = {
		image: opts.image,
		width: opts.width,
		height: opts.height
	}
	for(var opt in opts){
		opts[opt] = defaults[opt];
	}
	this.opts = opts;
	this.image = this.opts && this.opts.image;
	this.ctx = null;
	this.canvas = this.createCanvas();  
}
ConvertImage.prototype.Util = {
	clone: function(pixels){
		var tempPixels = [];
		for(var i=0;i<pixels.length;i++){
			tempPixels[i] = pixels[i];
		}
		return tempPixels;
	},
	sumArray: function(array){
		var result=0;	
		for(var i=0;i<array.length;i++){
			result += array[i]; 
		}
		return result;
	}
}
ConvertImage.prototype.createCanvas = function(){
	var canvas = document.createElement("canvas");
	canvas.height =	this.opts.height; 
	canvas.width = this.opts.width;

	return canvas;
}
ConvertImage.prototype.drawImage = function(){
	this.ctx = this.ctx || this.canvas.getContext("2d");
	this.ctx.clearRect(0,0,this.opts.width,this.opts.height);
	this.ctx.drawImage(this.image,0,0);
	return this;
}
/**
	@params x x is the current x axis
	@params y y is the current y axis
	@params radius
	if radius==1 ,the adjacency matrix is 3x3;if radius==2,the adjacency matrix is 5x5;
	@params pixels pixels is imagedata
**/
ConvertImage.prototype.getAdjacencyMatrix = function(x,y,radius,pixels){
	this.ajcMatrix = [];
	for(var i=y-radius;i<=y+radius;i++){
		for(var j=x-radius;j<=x+radius;j++){
			if(i<0 || j<0 || i>=this.opts.height || j>=this.opts.width){
				this.ajcMatrix.push("");
				continue;
			}
			var pos = (i*this.opts.width + j)*4;
			var pixel = {};
			pixel.r = pixels[pos];
			pixel.g = pixels[pos+1];
			pixel.b = pixels[pos+2];
			pixel.a = pixels[pos+3];
			this.ajcMatrix.push(pixel);
		}
	}
}
ConvertImage.prototype.getRGBA = function(x,y,pixels){
	var pos = (y*this.opts.width + x)*4;
	return {
		r: pixels[pos],
		g: pixels[pos+1],
		b: pixels[pos+2],
		a: pixels[pos+3]	
	}
}
ConvertImage.prototype.setRGBA = function(x,y,pixel,pixels){
	var pos = (y*this.opts.width + x)*4;
	pixels[pos] = pixel.r;
	pixels[pos+1] = pixel.g;
	pixels[pos+2] = pixel.b;
	return this;
}
/*
	nevatives 底片
	算法原理：将当前像素点的RGB值分别与255之差后的值作为当前点的RGB值，即
	R = 255 – R；G = 255 – G；B = 255 – B；
*/
ConvertImage.prototype.getNevatives = function(){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			var pixel = this.getRGBA(x,y,pixels);
			pixel.r = 255 - pixel.r;
			pixel.g = 255 - pixel.g;
			pixel.b = 255 - pixel.b;
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}
/**
	黑白	
	灰度处理一般有三种算法：
	1 最大值法：即新的颜色值R＝G＝B＝Max(R，G，B)，这种方法处理后的图片看起来亮度值偏高。
	2 平均值法：即新的颜色值R＝G＝B＝(R＋G＋B)／3，这样处理的图片十分柔和
	3 加权平均值法：即新的颜色值R＝G＝B＝(R ＊ Wr＋G＊Wg＋B＊Wb)，一般由于人眼对不同颜色的敏感度不一样，所以三种颜色值的权重不一样，一般来说绿色最高，红色其次，蓝色最低，最合理的取值分别为Wr ＝ 30％，Wg ＝ 59％，Wb ＝ 11％

	@params algorithm has values:
		1=>"maximum"
		2=>"average"
		3=>"weighted-average"
**/
ConvertImage.prototype.getBlackWhite = function(algorithm){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			var pixel = this.getRGBA(x,y,pixels);
			var retpix = "";
			switch (algorithm){
				case "average":
					retpix = (pixel.r+pixel.g+pixel.b)/3;
					break;
				case "maximum":
					retpix = pixel.r > pixel.g ? pixel.r : pixel.g;
					retpix = retpix > pixel.b ? retpix : pixel.b;
					break;
				case "weighted-average":
					retpix = pixel.r*0.3 + pixel.g*0.59 + pixel.b*0.11;
					break;
				default:
					retpix = pixel.r*0.3 + pixel.g*0.59 + pixel.b*0.11;
					break;
			}
			pixel.r = pixel.g = pixel.b = retpix;
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}
/**
	relief(浮雕)
	算法：
	对图像像素点的像素值分别与相邻像素点的像素值相减后加上128, 然后将其作为新的像素点的值.
**/
ConvertImage.prototype.getRelief = function(radius){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	var tempPixels = this.Util.clone(pixels);
	var ajcmatrTotPix = (radius*2+1)*(radius*2+1)-1;
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			this.getAdjacencyMatrix(x,y,radius,tempPixels);
			var r=g=b=0;
			var pixel = "";
			for(var i=0;i<this.ajcMatrix.length;i++){
				if(!this.ajcMatrix[i]){
					continue;
				}
				if(i==(this.ajcMatrix.length-1)/2+1){
					pixel = this.ajcMatrix[i];
				}
				r += this.ajcMatrix[i].r;
				g += this.ajcMatrix[i].g;
				b += this.ajcMatrix[i].b;
			}
			var tempPixel = {};
			tempPixel.r = pixel.r - r/ajcmatrTotPix + 128;
			tempPixel.g = pixel.g - g/ajcmatrTotPix + 128;
			tempPixel.b = pixel.b - b/ajcmatrTotPix + 128;

			tempPixel.r = Math.min(255,Math.max(tempPixel.r,0));
			tempPixel.g = Math.min(255,Math.max(tempPixel.g,0));
			tempPixel.b = Math.min(255,Math.max(tempPixel.b,0));

			tempPixel.r=tempPixel.g=tempPixel.b = tempPixel.r*0.3 + tempPixel.g*0.59 + tempPixel.b*0.11;
			this.setRGBA(x,y,tempPixel,pixels);
		}
	}
	delete tempPixels;
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}

/***
	 锐化
	 算法：突出显示颜色值大(即形成形体边缘)的像素点.
		g = f + c*laplacian 
	 g是输出，f为原始图像，c是系数，也就是要加上多少细节的多少
     
     @params laplacian laplacian width format:
     [   
         -1,-1,-1,
         -1,9,-1,
         -1,-1,-1
     ]
	 @params radius is laplacian matrix'radius
	 @params ratio is c in up 
***/

ConvertImage.prototype.getGsharpen = function(laplacian,ratio,radius){
	laplacian = laplacian || [-1,-1,-1,-1,9,-1,-1,-1,-1];
	radius = radius || 1;
	ratio = ratio || 0.5;
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	var tempPixels = this.Util.clone(pixels);
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			this.getAdjacencyMatrix(x,y,radius,tempPixels);
			var r=g=b=0;
			var pixel = "";
			for(var i=0;i<this.ajcMatrix.length;i++){
				if(!this.ajcMatrix[i]) {
					continue;
				}
				if(i==(this.ajcMatrix.length-1)/2+1){
					pixel = this.ajcMatrix[i];
				}
				r += this.ajcMatrix[i].r * laplacian[i];
				g += this.ajcMatrix[i].g * laplacian[i];
				b += this.ajcMatrix[i].b * laplacian[i];
			}
			var tempPixel = {};
			tempPixel.r = pixel.r + r * ratio;
			tempPixel.g = pixel.g + g * ratio;
			tempPixel.b = pixel.b + b * ratio;

			tempPixel.r = Math.min(255,Math.max(tempPixel.r,0));
			tempPixel.g = Math.min(255,Math.max(tempPixel.g,0));
			tempPixel.b = Math.min(255,Math.max(tempPixel.b,0));

			this.setRGBA(x,y,tempPixel,pixels);
		}
	}
	delete tempPixels;
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}

/**
	Gaussian Blur (高斯模糊)
	算法：http://www.chinaz.com/design/2012/1116/282385_3.shtml

	@params sigma => σ 
	@params int(radius) 模糊半径
**/

ConvertImage.prototype.getGaussBlur = function(sigma,radius){
	sigma = sigma || 1.5;
	radius = radius || 1;
	//Gauss权重矩阵大小
	var w=h=radius*2+1;
	//根据sigma与radius,计算Guss权重矩阵的值
	var	gauss = new Array(w*h),index=0;
	for(var i=0;i<h;i++){
		for(var j=0;j<w;j++){
			var x = j - radius,
				y = -(i - radius);
			gauss[index++] = 1/(2*Math.PI*Math.pow(sigma,2))*Math.exp(-(Math.pow(x,2)+Math.pow(y,2))/(2*Math.pow(sigma,2)))		
		}
	}
	//使权重值之和为1
	var sum = this.Util.sumArray(gauss);
	for(var i=0;i<gauss.length;i++){
		gauss[i] = gauss[i]/sum;
	}
	//计算高斯模糊图像
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	var tempPixels = this.Util.clone(pixels);
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			this.getAdjacencyMatrix(x,y,radius,tempPixels);
			var r=g=b=0;
			var pixel = "";
			for(var i=0;i<this.ajcMatrix.length;i++){
				if(!this.ajcMatrix[i]) {
					continue;
				}
				r += this.ajcMatrix[i].r * gauss[i];
				g += this.ajcMatrix[i].g * gauss[i];
				b += this.ajcMatrix[i].b * gauss[i];
			}
			var tempPixel = {};
			tempPixel.r = r;
			tempPixel.g = g;
			tempPixel.b = b;

			tempPixel.r = Math.min(255,Math.max(tempPixel.r,0));
			tempPixel.g = Math.min(255,Math.max(tempPixel.g,0));
			tempPixel.b = Math.min(255,Math.max(tempPixel.b,0));

			this.setRGBA(x,y,tempPixel,pixels);
		}
	}
	delete tempPixels;
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}

/**
 * Implements the Stack Blur Algorithm (@see http://www.quasimondo.com/StackBlurForCanvas/StackBlurDemo.html).
 * @param radius blur radius
 */
ConvertImage.prototype.getStackBlur = function(radius) {
	var shgTable = [
		[0, 9],
		[1, 11],
		[2, 12],
		[3, 13],
		[5, 14],
		[7, 15],
		[11, 16],
		[15, 17],
		[22, 18],
		[31, 19],
		[45, 20],
		[63, 21],
		[90, 22],
		[127, 23],
		[181, 24]
	];

	var mulTable = [
		512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
		454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
		482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
		437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
		497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
		320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
		446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
		329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
		505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
		399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
		324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
		268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
		451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
		385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
		332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
		289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
	];

	radius |= 0;
	var width = this.opts.width,height = this.opts.height;
	this.drawImage();
	var imageData = this.ctx.getImageData(0, 0, width, height);
	var pixels = imageData.data;
	var x,
		y,
		i,
		p,
		yp,
		yi,
		yw,
		rSum,
		gSum,
		bSum,
		rOutSum,
		gOutSum,
		bOutSum,
		rInSum,
		gInSum,
		bInSum,
		pr,
		pg,
		pb,
		rbs;
	var radiusPlus1 = radius + 1;
	var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

	var stackStart = new BlurStack();
	var stackEnd = new BlurStack();
	var stack = stackStart;
	for (i = 1; i < 2 * radius + 1; i++) {
		stack = stack.next = new BlurStack();
		if (i === radiusPlus1) {
			stackEnd = stack;
		}
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;

	yw = yi = 0;

	var mulSum = mulTable[radius];
	var shgSum;
	for (var ssi = 0; ssi < shgTable.length; ++ssi) {
		if (radius <= shgTable[ssi][0]) {
			shgSum = shgTable[ssi - 1][1];
			break;
		}
	}

	for (y = 0; y < height; y++) {
		rInSum = gInSum = bInSum = rSum = gSum = bSum = 0;

		rOutSum = radiusPlus1 * (pr = pixels[yi]);
		gOutSum = radiusPlus1 * (pg = pixels[yi + 1]);
		bOutSum = radiusPlus1 * (pb = pixels[yi + 2]);

		rSum += sumFactor * pr;
		gSum += sumFactor * pg;
		bSum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		for (i = 1; i < radiusPlus1; i++) {
			p = yi + ((width - 1 < i ? width - 1 : i) << 2);
			rSum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
			gSum += (stack.g = (pg = pixels[p + 1])) * rbs;
			bSum += (stack.b = (pb = pixels[p + 2])) * rbs;

			rInSum += pr;
			gInSum += pg;
			bInSum += pb;

			stack = stack.next;
		}

		stackIn = stackStart;
		stackOut = stackEnd;
		for (x = 0; x < width; x++) {
			pixels[yi] = (rSum * mulSum) >> shgSum;
			pixels[yi + 1] = (gSum * mulSum) >> shgSum;
			pixels[yi + 2] = (bSum * mulSum) >> shgSum;

			rSum -= rOutSum;
			gSum -= gOutSum;
			bSum -= bOutSum;

			rOutSum -= stackIn.r;
			gOutSum -= stackIn.g;
			bOutSum -= stackIn.b;

			p = (yw + ((p = x + radius + 1) < (width - 1) ? p : (width - 1))) << 2;

			rInSum += (stackIn.r = pixels[p]);
			gInSum += (stackIn.g = pixels[p + 1]);
			bInSum += (stackIn.b = pixels[p + 2]);

			rSum += rInSum;
			gSum += gInSum;
			bSum += bInSum;

			stackIn = stackIn.next;

			rOutSum += (pr = stackOut.r);
			gOutSum += (pg = stackOut.g);
			bOutSum += (pb = stackOut.b);

			rInSum -= pr;
			gInSum -= pg;
			bInSum -= pb;

			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}

	for (x = 0; x < width; x++) {
		gInSum = bInSum = rInSum = gSum = bSum = rSum = 0;

		yi = x << 2;
		rOutSum = radiusPlus1 * (pr = pixels[yi]);
		gOutSum = radiusPlus1 * (pg = pixels[yi + 1]);
		bOutSum = radiusPlus1 * (pb = pixels[yi + 2]);

		rSum += sumFactor * pr;
		gSum += sumFactor * pg;
		bSum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		yp = width;

		for (i = 1; i < radiusPlus1; i++) {
			yi = (yp + x) << 2;

			rSum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
			gSum += (stack.g = (pg = pixels[yi + 1])) * rbs;
			bSum += (stack.b = (pb = pixels[yi + 2])) * rbs;

			rInSum += pr;
			gInSum += pg;
			bInSum += pb;

			stack = stack.next;

			if (i < (height - 1)) {
				yp += width;
			}
		}

		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for (y = 0; y < height; y++) {
			p = yi << 2;
			pixels[p] = (rSum * mulSum) >> shgSum;
			pixels[p + 1] = (gSum * mulSum) >> shgSum;
			pixels[p + 2] = (bSum * mulSum) >> shgSum;

			rSum -= rOutSum;
			gSum -= gOutSum;
			bSum -= bOutSum;

			rOutSum -= stackIn.r;
			gOutSum -= stackIn.g;
			bOutSum -= stackIn.b;

			p = (x + (((p = y + radiusPlus1) < (height - 1) ? p : (height - 1)) * width)) << 2;

			rSum += (rInSum += (stackIn.r = pixels[p]));
			gSum += (gInSum += (stackIn.g = pixels[p + 1]));
			bSum += (bInSum += (stackIn.b = pixels[p + 2]));

			stackIn = stackIn.next;

			rOutSum += (pr = stackOut.r);
			gOutSum += (pg = stackOut.g);
			bOutSum += (pb = stackOut.b);

			rInSum -= pr;
			gInSum -= pg;
			bInSum -= pb;

			stackOut = stackOut.next;

			yi += width;
		}
	}
	this.ctx.putImageData(imageData, 0, 0);
	var base64data = this.canvas.toDataURL();
	return base64data;
};

/**
 * Defines a new helper object for Stack Blur Algorithm.
 */
function BlurStack() {
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.next = null;
}

/**
	光照
	算法： 给定关照原点与关照半径，沿原点向外发散，每个点加一个数值，距离原点越远该值越小
	
	@params centerX
	@params centerY 
	@params radius 
	@params wight
**/
ConvertImage.prototype.getLighting = function(centerX,centerY,radius,weight){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			var distance = Math.sqrt(Math.pow((centerX-x),2) + Math.pow((centerY-y),2));
			var pixel = this.getRGBA(x,y,pixels);
			if(distance<=radius){
				var pix = Math.floor(weight * (1-distance/radius));
				pixel.r = pixel.r + pix;	
				pixel.g = pixel.g + pix;
				pixel.b = pixel.b + pix;
				pixel.r = Math.min(255,Math.max(pixel.r,0));
				pixel.g = Math.min(255,Math.max(pixel.g,0));
				pixel.b = Math.min(255,Math.max(pixel.b,0));
			}
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;

}

























