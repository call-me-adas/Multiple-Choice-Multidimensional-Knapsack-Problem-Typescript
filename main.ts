import file from "./main.json";

/* Generate a random number in [min, max] */
const generateRandomNumber = (min : number, max : number) :number =>
{
	return Math.floor(Math.random() * max) + min;
}

/* Generate a random number in [0, 1) */
const generateDoubleRandomNumber = () :number =>
{
	return Math.floor(Math.random() * 100) / 100;
}

/* Return a random crossover type */
const randomCrossover = () =>
{
	return generateDoubleRandomNumber() * 2;
}


/* Class used for creating a global vector of greedy objects */
class GreedyObject
{
	public ratio : number;
	public group : number;
	public index : number;

    constructor(g:number = 0, r:number = 0, i:number = 0)
    {
        this.ratio = r;
        this.group = g;
        this.index = i;
    }
}

class Group
{
	public group: number;
    public objects: Array<GreedyObject> = [];

    constructor(g: number)
    {
        this.group = g;
    }

    compare(a, b) :number {
        if (a.ratio > b.ratio) return 1;
        if (b.ratio > a.ratio) return -1;
        
        return 0;
    }

    sortObjects = () :void =>
    {
        this.objects = this.objects.sort(this.compare);
    }

    getObjectAtIndex = (index:number) =>
    {
        return this.objects[index];
    }

    addObject(obj: GreedyObject): void
    {
        this.objects.push(obj);
    }

    getObject(index: number) : GreedyObject
    {
        return this.objects[index];
    }
};


/* Globals */
let NUMBER_GROUPS = 0; // populated in processData()
let NUMBER_OBJECTS_IN_GROUP = 0; // populated in processData()
let NUMBER_CONSTRAINTS = 0; // populated in processData()
let CONSTRAINTS; // populated in processData()
let CAPACITIES; // populated in processData()
let VALUES; // populated in processData()
let VALID_SOLUTION_ITERATIONS; // populated in main()

/* Simulated Annealing variables */
let ANNEALING_ITERATIONS = 100000;
let RANDOM_CHANGES; // populated in main()
let ANNEALING_FACTOR = 10;

/* Global vectors for various uses across the algorithm */
let GREEDY_OBJECTS: Array<GreedyObject> = [];
let GROUPS: Array<Group> = [];
let RATIO_OBJECTS: Array<GreedyObject> = [];

/* Process the data and populate the global variables.
 	The data is in the format specified by the following URL:
   ftp://cermsem.univ-paris1.fr/pub/CERMSEM/hifi/MMKP/MMKP.html
*/
const processData = (file): void =>
{

   NUMBER_GROUPS = file.datasetsSize;
	NUMBER_OBJECTS_IN_GROUP = file.datasetWidth;
	NUMBER_CONSTRAINTS = file.datasetHeight;


   /* Capacities */
   CAPACITIES = new Array(NUMBER_CONSTRAINTS);
	for(let i=0; i<NUMBER_CONSTRAINTS; i++)
    {
            CAPACITIES[i] = file.restrictions[i];
    }

    VALUES = new Array(NUMBER_GROUPS);
    CONSTRAINTS = new Array(NUMBER_GROUPS);

	for(let i=0; i<NUMBER_GROUPS; i++)
	{
        CONSTRAINTS[i] = new Array(NUMBER_OBJECTS_IN_GROUP);
      VALUES[i] = new Array(NUMBER_OBJECTS_IN_GROUP);
      
      for(let g=0; g<NUMBER_OBJECTS_IN_GROUP; g++)
      {
        CONSTRAINTS[i][g] = new Array(NUMBER_CONSTRAINTS);
              
              let value = file.datasets[0][i][0];
              console.log('value', file.datasets[0][i][0])
   	   VALUES[i][g] = value;

	      for(let c=0; c<NUMBER_CONSTRAINTS; c++)
   	   {
	         CONSTRAINTS[i][g][c] = file.datasets[0][i][g+1];
   	   }
      }
	}

}


/* A solution in the simulated annealing algorithm */
class MNode
{
	public objects: Array<number>;
    public weights: Array<number> = [];
    public value: number;

   /* Constructor */
   constructor(o: Array<number> = [])
   {
        this.objects = o;
        
        this.calculateValue();
        this.calculateWeights();
   }

   /* Calculate the objective function value */
   calculateValue = () =>
   {
        this.value = 0;
      for(let i=0; i<NUMBER_GROUPS; i++)
      {
      	    this.value+=VALUES[i][this.objects[i]];
      }
   }

   /* Calculate the weights array */
   calculateWeights = () =>
   {
      for(let i=0; i<NUMBER_CONSTRAINTS; i++)
      {
        this.weights[i] = 0;
      	for(let j=0; j<NUMBER_GROUPS; j++)
         {
            this.weights[i]+=CONSTRAINTS[j][this.objects[j]][i];
         }
      }
   }

   /* Does this solution violate any constraints? */
   violatesConstraints = () :boolean =>
   {
       for(let i=0; i<NUMBER_CONSTRAINTS; i++)
       {
       	if(this.weights[i] > CAPACITIES[i])
         {
         	return true;
         }
       }
       return false;
   }

   /* How much is the constraint violation? */
   constraintViolation = () :number =>
   {
   	let violation = 0;
   	for(let i=0; i<NUMBER_CONSTRAINTS; i++)
      {
      	if(this.weights[i] > CAPACITIES[i])
         {
         	violation+=(this.weights[i]-CAPACITIES[i]);
         }
      }
      return violation;
   }

   /* Change the selection of the passed in group to the passed in assignment */
   changeSelection = (group: number, assignment: number) :void =>
   {
   	if(this.objects[group] == assignment)
      	return;

   	let previous = this.objects[group];
      for(let i=0; i<NUMBER_CONSTRAINTS; i++)
      {
        this.weights[i]-=CONSTRAINTS[group][previous][i];
      }

      this.value-=VALUES[group][previous];

      for(let i=0; i<NUMBER_CONSTRAINTS; i++)
      {
        this.weights[i]+=CONSTRAINTS[group][assignment][i];
      }

      this.value+=VALUES[group][assignment];

      this.objects[group] = assignment;
   }

   /* Return the fitness of this solution.
    	This is the value if none of the constraints are violated.
      If a constraint is violated, the fitness is -100
      */
   fitness = () : number =>
   {
   	if(this.violatesConstraints())
      {
      	return -100;
      }
      else
      {
      	return this.value;
      }
   }

   /* Get the selection of passed in group */
   getValueOfIndex = (index: number): number =>
   {
   	return this.objects[index];
   }

};

const simulatedAnnealing = (n: MNode) : void =>
{
	let node: MNode = {...n};
   let best: MNode = {...n};
	for(let i=0; i < ANNEALING_ITERATIONS; i++)
	{
   	/* Make random changes to the solution */
   	for(let j=0; j<RANDOM_CHANGES; j++)
      {
        let rand1 = generateRandomNumber(0, NUMBER_GROUPS-1);
        let rand2 = generateRandomNumber(0, NUMBER_OBJECTS_IN_GROUP-1);
         while(node.getValueOfIndex(rand1) == rand2)
         {
          	rand1 = generateRandomNumber(0, NUMBER_GROUPS-1);
				rand2 = generateRandomNumber(0, NUMBER_OBJECTS_IN_GROUP-1);
         }
         node.changeSelection(rand1, rand2);
      }

      /* If the node violates any of the constraints, correct the solution.
       	Correction will take place in order of non-decreasing order of the
         utility ratio (greedy) of the chosen objects in the solution */
      if(node.violatesConstraints())
      {
	      let vec: Array<GreedyObject>;
   	   for(let k=0; k<NUMBER_GROUPS; k++)
      	{
	      	let sel = node.getValueOfIndex(k);
   	      let ratio = RATIO_OBJECTS[k][sel].ratio;
      	   let obj = new GreedyObject(k, ratio, sel);
				vec.push(obj);
	      }

          vec = vec.sort((a,b) => (a.ratio > b.ratio) ? 1 : ((b.ratio > a.ratio) ? -1 : 0));

      	let count: number = vec.length-1;
         while(node.violatesConstraints())
         {
         	let val = -1;
            if(count < 0)
            {
            	val = generateRandomNumber(0, NUMBER_GROUPS-1);
            }
            else
            {
					let obj: GreedyObject = vec[count];
	            count--;
               val = obj.group;
            }

            let group: Group = GROUPS[val];
            for(let i=0; i<NUMBER_OBJECTS_IN_GROUP; i++)
		      {
      			let obj: GreedyObject = this.group.objects[i];
		         let index: number = obj.index;
   		      let group: number = obj.group;
					let previous: number = node.getValueOfIndex(group);
         		let pv: number = node.constraintViolation();
	         	node.changeSelection(group, index);
	   	      let nv: number = node.constraintViolation();
   	   	   if(pv < nv)
      	   	{
	      	   	node.changeSelection(group, previous);
   	      	}
            }
      	}
      }

		let numObjects: number = NUMBER_GROUPS * NUMBER_OBJECTS_IN_GROUP;

      /* Try to improve upon the solution by upgrading the most promising objects */
   	for(let ii=0; ii<numObjects; ii++)
	   {
   		let obj: GreedyObject = GREEDY_OBJECTS[ii];
   	  	let index: number = obj.index;
	      let group: number = obj.group;
      	let previous: number = node.getValueOfIndex(group);
	      let preValue: number = node.fitness();
   	   node.changeSelection(group, index);
      	if(node.violatesConstraints() || preValue > node.fitness())
	      {
   	   	node.changeSelection(group, previous);
      	}
	   }

      console.log('Iteration ', i, ' Fitness: ', best.fitness());

      if(best.fitness() < node.fitness())
      {
         best = node;
      }
      else
      {
      	/* Linear Annealing Schedule */
      	let probability: number = i / ANNEALING_ITERATIONS;
         probability*=ANNEALING_FACTOR;
         let rand: number = generateDoubleRandomNumber();
         if(rand < probability)
         	node = best;
   	}
   }

   n = best;
}

const greedyAlgorithm = (): MNode =>
{
	/* Create the global vector of GREEDY_OBJECTS */
   let RATIO_OBJECTS = new Array(NUMBER_GROUPS);
	for(let i=0; i<NUMBER_GROUPS; i++)
   {
      RATIO_OBJECTS[i] = new Array<GreedyObject>(NUMBER_OBJECTS_IN_GROUP);
   	let group = new Group(i);
   	for(let j=0; j<NUMBER_OBJECTS_IN_GROUP; j++)
      {
        let weight = 0;
      	for(let k=0; k<NUMBER_CONSTRAINTS; k++)
         {
         	weight+=CONSTRAINTS[i][j][k];
         }

         let value = VALUES[i][j];
         let ratio = value/weight;
        let obj: GreedyObject = new GreedyObject(i, ratio, j);
         GREEDY_OBJECTS.push(obj);
         let o: GreedyObject = new GreedyObject(i, ratio, j);
         group.addObject(o);
         RATIO_OBJECTS[i][j] = o;

      }
      group.sortObjects();
      GROUPS.push(group);
   }
 
   GREEDY_OBJECTS = GREEDY_OBJECTS.sort((a,b) => (a.ratio > b.ratio) ? 1 : ((b.ratio > a.ratio) ? -1 : 0));

   let flags: Array<number> = [];
   for(let i=0; i<NUMBER_GROUPS; i++)
   {
   	flags[i] = 0;
   }

   /* Construct a solution from the GREEDY_OBJECTS */
   let numObjects = NUMBER_GROUPS * NUMBER_OBJECTS_IN_GROUP;
   let objects: Array<number> = [];
   let chain: Array<number> = [];
   let count = 0;
   for(let i=0; i<numObjects; i++)
   {
       let obj: GreedyObject = GREEDY_OBJECTS[i];
       let group: number = obj.group;
       let index: number = obj.index;
       if(flags[group] == 0)
       {
       	chain[count] = group;
         count++;
       	objects[group] = index;
         flags[group] = 1;
       }
   }
   let node:MNode = new MNode(objects);

   /* Try to correct conflicts from the solution node */
   count = NUMBER_GROUPS -1;
   let nn: number = 0;
	while(node.violatesConstraints())
   {
   	let val: number = -1;
      if(count < 0)
   		val = generateRandomNumber(0, NUMBER_GROUPS-1);
      else
      	val = chain[count];

      count--;
   	let group: Group = GROUPS[val];
      for(let i=0; i<NUMBER_OBJECTS_IN_GROUP; i++)
      {
      	let obj: GreedyObject = group.objects[i];
         let index: number = obj.index;
         let group2: number = obj.group;
			let previous: number = node.getValueOfIndex(group2);
            let pv: number = node.constraintViolation();
         node.changeSelection(group2, index);
         let nv: number = node.constraintViolation();
         if(pv < nv)
         {
         	node.changeSelection(group2, previous);
         }
      }

      nn++;
      if(nn > VALID_SOLUTION_ITERATIONS)
      {
          console.log("A valid solution might NOT exist for the instance! Quitting.");
          return;
      }
   }

   /* Try to improve upon the solution by upgrading objects
    in the order given by GREEDY_OBJECTS */
   for(let i=0; i<numObjects; i++)
   {
   	let obj: GreedyObject = GREEDY_OBJECTS[i];
       let index: number = obj.index;
       let group: number = obj.group;
       let previous: number = node.getValueOfIndex(group);
       let preValue: number = node.fitness();
      node.changeSelection(group, index);
      if(node.violatesConstraints() || preValue > node.fitness())
      {
      	node.changeSelection(group, previous);
      }
   }

   console.log('Greedy Solution: ', node.fitness());

   return node;
}

// MAIN
processData(file);
ANNEALING_ITERATIONS = file.datasetsSize;

/* How much time to spend in finding a valid solution before quitting? */
VALID_SOLUTION_ITERATIONS = NUMBER_GROUPS * NUMBER_OBJECTS_IN_GROUP;

/* The number of random changes that simulated annealing
    performs on the solution. The values are found experimentally */
if(NUMBER_GROUPS < 50) {
    RANDOM_CHANGES = 3;
}
else {
    RANDOM_CHANGES = 5;
}

/* Run the greedy algorthm. This function populates the global vectors:
GREEDY_OBJECTS, RATIO_OBJECTS, and GROUPS */
let node: MNode = greedyAlgorithm();

/* Run the simulated annealing algorithm on the solution produced by the greedy algorithm */
simulatedAnnealing(node);

/* Print the final solution */
console.log("Final solution: ", node.fitness());


for(let i=0; i<NUMBER_GROUPS;i++)
{
    console.log(" ", node.getValueOfIndex(i));
}
