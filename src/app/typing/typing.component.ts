import { Component } from '@angular/core';
import { HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// TODO:
// 2. design the page
// 3. write a backend for this
// 4. repeat or new

export class CodeSnippet {
    snippet:string ="";
}

@Component({
  selector: 'app-typing',
  templateUrl: './typing.component.html',
  styleUrls: ['./typing.component.css']
})
export class TypingComponent {
    excerpt_:string = "def main(): print(hello world)";
    excerpt:string = "";
    excerpt_array:string[] = [];
    key:string = "";
    pointer:number = 0;
    class_array:any = [];
    line_change:boolean[] = [];
    to_be_checked:boolean[] = [];
    start_time:number = 0;
    end_time:number = 0;
    quote_length:number = this.excerpt_.length;
    wpm:number = 0;
    live_error:number = 0;
    error_count:number = 0;
    new_code:string = "";

    custom_layout:boolean = false;
    custom_text:string = "";

    constructor(private httpClient: HttpClient) {
        this.preProcess();
    }

    preProcess() {
        this.excerpt_ = this.excerpt_.replaceAll('\t', '    ');
        this.excerpt = ""
        this.excerpt_array = [];
        this.pointer = 0;
        this.class_array = [];
        this.line_change = [];
        this.to_be_checked = [];
        for(let i = 0; i < this.excerpt_.length; i++) {
            let char = this.excerpt_[i];
            if (char === '\n') {
                this.line_change[this.line_change.length-1] = true;
                continue;
            }
            this.line_change.push(false);
            this.excerpt += char;
            this.excerpt_array.push(char === ' '? ' ': char);
            this.class_array.push({curr: false, not_done: true, correct: false, incorrect: false});
            this.class_array[0]['curr'] = true;
            this.to_be_checked.push(true);
        }
        for(let i = 0; i < this.excerpt.length; i++) {
            if(i + 3 < this.excerpt.length && this.excerpt[i] === ' '
                && this.excerpt[i+1] === ' ' && this.excerpt[i+2] === ' '
                && this.excerpt[i+3] === ' ') {
                this.to_be_checked[i] = false;
                this.to_be_checked[i+1] = false;
                this.to_be_checked[i+2] = false;
                this.to_be_checked[i+3] = false;
                i = i+3;
                this.quote_length -= 4;
            }
        }
    }

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        this.key = event.key;
        if(this.pointer === 0) this.start_time = (new Date).getTime();
        if (this.pointer < this.excerpt.length &&
            this.key === this.excerpt[this.pointer]) {

            if (!this.class_array[this.pointer]['incorrect']) {
                this.class_array[this.pointer]['correct'] = true;
            }
            this.class_array[this.pointer]['not_done'] = false;
            this.class_array[this.pointer]['curr'] = false;

            this.pointer += 1;
            while(this.pointer < this.to_be_checked.length &&
                !this.to_be_checked[this.pointer]) {
                this.pointer += 1;
            }
            if (this.pointer < this.class_array.length)
                this.class_array[this.pointer]['curr'] = true;
        }
        else if (this.pointer < this.class_array.length){
            this.live_error += 1;
            this.class_array[this.pointer]['incorrect'] = true;
            this.class_array[this.pointer]['not_done'] = false;
            this.class_array[this.pointer]['curr'] = true;
        }
        if(this.pointer == this.excerpt.length)
            this.reset();
    }

    reset() {
        this.end_time = (new Date).getTime();
        this.calculateWPM();
        this.error_count = this.live_error
        this.live_error = 0;
        this.pointer = 0;
        for(let i = 0; i < this.class_array.length; i++) {
            this.class_array[i] = {
                curr: false,
                not_done: true,
                correct: false,
                incorrect: false
            };
        }
        this.class_array[0]['curr'] = true;
        // this.newCodeSnippet();
    }

    calculateWPM() {
        let total_time = (this.end_time - this.start_time)/1000;
        this.quote_length = this.excerpt_.length;
        let word_length = this.quote_length / 5;
        this.wpm = (word_length * 60) / total_time;
        this.wpm = Math.round(this.wpm * 100) / 100;
    }

    getClass(idx:number) {
        return this.class_array[idx];
    }

    newCodeSnippet() {
        this.httpClient.get<CodeSnippet>('http://localhost:8000/snippet').subscribe(
            response => {
                this.new_code = response.snippet;
                this.excerpt_ = this.new_code;
                this.preProcess();
            },
            error => {
                console.log(error);
            }
        );
    }

    customCodeSnippet() {
        this.custom_layout = true;

    }
    submitCustomSnippet() {
        var words = this.custom_text.split(',');
        if (words.length == 0) {
            this.custom_layout = false;
            return;
        }
        var total_length = 0;
        for(let word of words) {
            total_length += word.length;
        }
        var avg_length = Math.floor(total_length/words.length);
        var words_ = [];
        var limit = 10;
        var line_limit = 40;
        let count = 1;

        for(let i = 0; i < limit; i++) {
            words_.push(words[i%words.length] + " ");
            if (avg_length * i > count * line_limit) {
                words_.push('\n');
                count += 1;
                console.log(count * line_limit, avg_length * i);
            }
        }
        var new_string = words_.join("");
        console.log(new_string);

        this.excerpt_ = new_string;
        this.preProcess();
        this.custom_layout = false;
    }

}
