console.log('hi')

func = () => {
    let cnt=0;
    this.increase = ()=>cnt++;
    this.getCount = ()=> cnt;
    this.reset=()=>cnt=0;
    return {
        increase : this.increase,
        getCount : this.getCount,
        reset: this.reset
    }
}

f1=func();
f1.increase();
f1.increase();
cnt=f1.getCount()
console.log(cnt)
f1.reset()
console.log(f1.getCount)
