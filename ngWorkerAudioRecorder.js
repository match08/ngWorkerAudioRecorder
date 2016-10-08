/**
* ngWorkerAudioRecorder Module
*
* website http://www.weismarts.com
* author match08
* Description angular Audio Recorder Worker
*/
angular.module('ngWorkerAudioRecorder', ['ngWorker'])
//获取系统音视频服务
.factory('wsMediaService', function ($q) {
	// 获取
	self.init = function(){
		var deferred = $q.defer(); 
	    window.AudioContext = window.AudioContext || window.webkitAudioContext;
		navigator.getUserMedia  =  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;  
		window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
		if (navigator.getUserMedia){
			navigator.getUserMedia({audio: true}, function(stream){
				var audioContext = new AudioContext();
	        	deferred.resolve(stream);
			}, function(e) {
			    console.warn("No live audio input in this browser!");
			    deferred.reject(e); 
			});
		} 
		return 	deferred.promise;
	};
	return self;
})
//录制线程
.factory('AudioRecorderWorker', function () {

	return function(){


	    var outputSampleRate = 16000,
	    inSampleRate = 16000,
	    numChannels = 2,
        mimeType = 'audio/wav',
        recBufferService;

		this.onmessage = function(e){
		  switch(e.data.command){
		    case 'init':
		      init(e.data.config);
		      break;
		    case 'record':
		      record(e.data.buffer);
		      break;
		    case 'clear':
		      clear();
		      break;
		    case 'getBuffer':
		      getBuffer();
		      break; 
		    case 'exportWAV':
		      exportWAV(e.data.type);
		      break;  
		  }
		};
	
	    function _initBuffers() {
	    	recBufferService.initBuffers();
        }
        function _mergeBuffers(recBuffers, recLength) {
            var result = new Float32Array(recLength);
            var offset = 0;
            for (var i = 0; i < recBuffers.length; i++) {
                result.set(recBuffers[i], offset);
                offset += recBuffers[i].length;
            }
            return result;
        }

		function _writeString(view, offset, string){
		  for (var i = 0; i < string.length; i++){
		    view.setUint8(offset + i, string.charCodeAt(i));
		  }
		}

		function _floatTo16BitPCM(output, offset, input){
		  for (var i = 0; i < input.length; i++, offset+=2){
		    var s = Math.max(-1, Math.min(1, input[i]));
		    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
		  }
		}
		function _interleave(inputL, inputR){
		  var length = inputL.length + inputR.length;
		  var result = new Float32Array(length);
		 
		  var index = 0,
		    inputIndex = 0;
		 
		  while (index < length){
		    result[index++] = inputL[inputIndex];
		    result[index++] = inputR[inputIndex];
		    inputIndex++;
		  }
		  return result;
		}
		function _encodeWAV(samples){
		  var buffer = new ArrayBuffer(44 + samples.length * 2);
		  var view = new DataView(buffer);
		 
		  /* RIFF identifier */
		  _writeString(view, 0, 'RIFF');
		  /* file length */
		  view.setUint32(4, 32 + samples.length * 2, true);
		  /* RIFF type */
		  _writeString(view, 8, 'WAVE');
		  /* format chunk identifier */
		  _writeString(view, 12, 'fmt ');
		  /* format chunk length */
		  view.setUint32(16, 16, true);
		  /* sample format (raw) */
		  view.setUint16(20, 1, true);
		  /* channel count */
		  view.setUint16(22, 2, true);
		  /* sample rate */
		  view.setUint32(24, inSampleRate, true);
		  /* byte rate (sample rate * block align) */
		  view.setUint32(28, inSampleRate * 4, true);
		  /* block align (channel count * bytes per sample) */
		  view.setUint16(32, 4, true);
		  /* bits per sample */
		  view.setUint16(34, 16, true);
		  /* data chunk identifier */
		  _writeString(view, 36, 'data');
		  /* data chunk length */
		  view.setUint32(40, samples.length * 2, true);
		 
		  _floatTo16BitPCM(view, 44, samples);

		  return view;
		}
		function init(config){
		    inSampleRate = config.sampleRate;
		    outputBufferLength = config.outputBufferLength;
		    outputSampleRate = config.outputSampleRate || outputSampleRate;
		    numChannels = config.numChannels|| numChannels;
		    mimeType = config.mimeType|| mimeType;

		   	if(!config.recordBufferService){
		   		recBufferService = {};
		   		recBufferService.buffersLength = 0;
		   		recBufferService.buffers = [];
		   		recBufferService.initBuffers = function(){
		   			for (var channel = 0; channel < numChannels; channel++) {
		                recBufferService.buffers[channel] = [];
		            }
		   		};
		   		recBufferService.record = function(inputBuffer){
		        	for (var channel = 0; channel < numChannels; channel++) {
                		recBufferService.buffers[channel].push(inputBuffer[channel]);
		            }
		            recBufferService.buffersLength += inputBuffer[0].length;
		        };
		        recBufferService.clear = function(){
		        	recBufferService.buffersLength = 0;
	        		recBufferService.buffers= [];
		        };
		   	}else{
		   		recBufferService.init(config);
		   	}
		   	_initBuffers(); 
		}

		function record(inputBuffer){
		 	recBufferService.record(inputBuffer);
		}

		function clear(){
	        recBufferService.clear();
	        _initBuffers();
		}

		function getBuffer() {
		    var buffers = [];
		    for (var channel = 0; channel < numChannels; channel++) {
		       buffers.push(_mergeBuffers(recBufferService.buffers[channel], recBufferService.buffersLength));
		    }
		    this.postMessage({ command: 'getBuffer', data: buffers });
		}
		
        function exportWAV(type) {
            var buffers = [];
            for (let channel = 0; channel < numChannels; channel++) {
                buffers.push(_mergeBuffers(recBufferService.buffers[channel], recBufferService.buffersLength));
            }
            var interleaved;
            if (numChannels === 2) {
                interleaved = _interleave(buffers[0], buffers[1]);
            } else {
                interleaved = buffers[0];
            }
            var dataview = _encodeWAV(interleaved);
            var audioBlob = new Blob([dataview], {type: type});

            this.postMessage({command: 'exportWAV', data: audioBlob});
        }

	};
})
//audio Recorder worker
.factory('wsAudioRecorder', function (wsWorker, AudioRecorderWorker) {
	

    var AudioRecorder = function(source, cfg) {
		this.consumers = [];
		var config = cfg || {};
		var errorCallback = config.errorCallback || function() {};
		var inputBufferLength = config.inputBufferLength || 4096;
		var outputBufferLength = config.outputBufferLength || 4000;
		var numChannels = config.numChannels || 2;
		var mimeType = config.mimeType || 'audio/wav';

		var callbacks = {
            getBuffer: [],
            exportWAV: []
        };
		this.context = source.context;
		this.node = this.context.createScriptProcessor(inputBufferLength);
	
		wsWorker.$new('audioRecorderWorker', config.worker||AudioRecorderWorker);

		var frameCount = this.context.sampleRate * 2.0;
		var channels = 2;
		wsWorker.postMessage('audioRecorderWorker', {
		    command: 'init',
		    config: {
				sampleRate: this.context.sampleRate,
				outputBufferLength: outputBufferLength,
				outputSampleRate: (config.outputSampleRate || 16000)
		    }
		});
		var recording = false;
		this.node.onaudioprocess = function(e) {
		    if (!recording) return;

		    var buffer = [];
            for (var channel = 0; channel < numChannels; channel++) {
                buffer.push(e.inputBuffer.getChannelData(channel));
            }
  			wsWorker.postMessage('audioRecorderWorker',{
				command: 'record',
				buffer: buffer
		    });
		};
		this.start= function(data) {
		    this.consumers.forEach(function(workerid, y, z) {
	            wsWorker.postMessage(workerid, { command: 'start', data: data });
				recording = true;
				return true;
		    });
		    recording = true;
		    return (this.consumers.length > 0);
		};
		this.stop = function() {
		    if (recording) {
				this.consumers.forEach(function(workerid, y, z) {
		            wsWorker.postMessage(workerid, { command: 'stop' });
				});
				recording = false;
		    }
		   
		};
		this.cancel = function() {
		    this.stop();
		    wsWorker.postMessage('audioRecorderWorker',{ command: 'clear' });
		};

		this.getBuffer = function(callback){
 			callbacks['getBuffer'].push(callback);
     		wsWorker.postMessage('audioRecorderWorker',{ command: 'getBuffer' });
		};

		this.exportWAV = function(callback, type){
			callbacks['exportWAV'].push(callback);
			wsWorker.postMessage('audioRecorderWorker',{
				command: 'exportWAV',
				type: mimeType
			});
		};

		this.forceDownload = function(blob, filename){
			if(!blob){return false;}
			var url = window.URL.createObjectURL(blob);
		    var link = window.document.createElement('a');
		    link.href = url;
		    link.download = filename || 'output.wav';
		    var click = document.createEvent("Event");
		    click.initEvent("click", true, true);
		    link.dispatchEvent(click);
		    return true;
		};

		myClosure = this;
		wsWorker.onMessage('audioRecorderWorker', function(e) {
		    if (e.data.error && (e.data.error == "silent")) errorCallback("silent");
		    switch(e.data.command){
		    	case 'newBuffer':
					myClosure.consumers.forEach(function(workerid, y, z) {
			            wsWorker.postMessage(workerid, { command: 'process', data: e.data.data });
					});
		    	break;
		    	case 'getBuffer':
		    		var callback = callbacks[e.data.command].pop();
		    		callback(e.data.data);
		    	break;
		    	case 'exportWAV':
		    		var callback = callbacks[e.data.command].pop();
		    		callback(e.data.data);
		    	break;
		    }

		});
		source.connect(this.node);
		this.node.connect(this.context.destination);
    };

    var self = {};
    //使能
	self.$new = function(stream, audioRecorderConfig){
		var AudioContext =  window.AudioContext;  
		var audioContext = new AudioContext();
		var input = audioContext.createMediaStreamSource(stream);
		window.firefox_audio_hack = input;
		return new AudioRecorder(input, audioRecorderConfig);
	};
	return self;
});