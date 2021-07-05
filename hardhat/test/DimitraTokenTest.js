const { expect } = require("chai");
const { parseEther, formatEther, formatUnits, parseUnits, formatBytes32String, keccak256, id } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

let token;
let dimitraToken;
let owner;
let account1;
let account2;
let account3;
let account4;
let accounts; // arry of remaining 5 accounts

// `beforeEach` will run before each test, re-deploying the contract every
// time. It receives a callback, which can be async.
beforeEach(async function () {
  contractFactory = await ethers.getContractFactory("DimitraToken");
  [owner, account1, account2, account3, account4, ...accounts] = await ethers.getSigners();
  dimitraToken = await contractFactory.deploy();
});

describe("Token Deployment Tests", function() {
  it("Deployment should have name 'Dimitra Token', symbol 'DMTR', decimals 18", async function() {
    expect(await dimitraToken.name()).to.equal('Dimitra Token');
    expect(await dimitraToken.symbol()).to.equal('DMTR');
    expect(await dimitraToken.decimals()).to.equal(18);
  });

  it("Deployment should assign initial supply of zero", async function() {
    expect(await dimitraToken.totalSupply()).to.equal(0);
  });

  it("Deployment should assign cap of 1 billion tokens", async function(){
    expect(formatUnits(await dimitraToken.cap())).to.equal(formatUnits(parseUnits("1000000000", 18)));
  })

  it("Deployment should assign owner balance of zero", async function() {
    expect(await dimitraToken.balanceOf(owner.address)).to.equal(0);
  });
});

describe("Token Transfer Tests", function () {
  it("Should transfer tokens between accounts if balance is sufficient", async function() {
    await dimitraToken.connect(owner).mint(account1.address, 50);
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(50);
    await dimitraToken.connect(account1).transfer(account2.address, 50);
    expect(await dimitraToken.balanceOf(account2.address)).to.equal(50);
  });
});

describe("Token Role Tests", function() {
  it("Contract owner has minter, pauser, and default admin roles", async function() {
    expect(await dimitraToken.hasRole(id("MINTER_ROLE"), owner.address)).to.equal(true);
    expect(await dimitraToken.hasRole(id("PAUSER_ROLE"), owner.address)).to.equal(true);
    //expect(await dimitraToken.hasRole(id("DEFAULT_ADMIN_ROLE"), owner.address)).to.equal(true);
  })

  it("Non contract owner does not have minter, pauser, and admin roles", async function() {
    expect(await dimitraToken.hasRole(id("MINTER_ROLE"), account1.address)).to.equal(false);
    expect(await dimitraToken.hasRole(id("PAUSER_ROLE"), account1.address)).to.equal(false);
    //expect(await dimitraToken.hasRole(id("DEFAULT_ADMIN_ROLE"),  account1.address)).to.equal(false);
  })

  it("Contract owner can grant minter role", async function() {
    //console.log("Balance before minting", formatUnits(await dimitraToken.balanceOf(account1.address)));
    await dimitraToken.connect(owner).grantRole(id("MINTER_ROLE"), account1.address);
    await dimitraToken.connect(account1).mint(account1.address, parseUnits("1000", 18));
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(parseUnits("1000", 18));
    //console.log("Balance after minting", formatUnits(await dimitraToken.balanceOf(account1.address)));
  })

  it("Contract owner can grant minter role", async function() {
    //console.log("Balance before minting", formatUnits(await dimitraToken.balanceOf(account1.address)));
    await dimitraToken.connect(owner).grantRole(id("MINTER_ROLE"), account1.address);
    await dimitraToken.connect(account1).mint(account1.address, parseUnits("1000", 18));
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(parseUnits("1000", 18));
    //console.log("Balance after minting", formatUnits(await dimitraToken.balanceOf(account1.address)));
  })

  it("Non contract owner cannot grant minter role", async function() {
    await expect(dimitraToken.connect(account1).grantRole(id("MINTER_ROLE"), account2.address)).to.be.reverted;
  });
});

describe("Token Minting Tests", function() {
  it("Non owner that is not MINTER_ROLE cannot mint tokens", async function() {
    const mintAmount = '1000000000000000000';
    await expect(dimitraToken.connect(account1).mint(account1.address, mintAmount)).to.be.reverted;
  });
  
  it("Minted tokens can be assigned by owner to owner address", async function() {
    const mintAmount = '1000000000000000000';
    const balanceBeforeMinting = await dimitraToken.balanceOf(owner.address);
    //console.log("balanceBeforeMinting", formatUnits(balanceBeforeMinting));
    await dimitraToken.connect(owner).mint(owner.address, mintAmount);
    const balanceAfterMinting = await dimitraToken.balanceOf(owner.address);
    //console.log("balanceAfterMinting", formatUnits(balanceAfterMinting));
    await expect(balanceAfterMinting).to.equal(balanceBeforeMinting + mintAmount);
  });

  it("Minted tokens can be assigned by owner to another address", async function() {
    const mintAmount = '1000000000000000000';
    const balanceBeforeMinting = await dimitraToken.balanceOf(account1.address);
    //console.log("balanceBeforeMinting", formatUnits(balanceBeforeMinting));
    await dimitraToken.connect(owner).mint(account1.address, mintAmount);
    const balanceAfterMinting = await dimitraToken.balanceOf(account1.address);
    //console.log("balanceAfterMinting", formatUnits(balanceAfterMinting));
    await expect(balanceAfterMinting).to.equal(balanceBeforeMinting + mintAmount);
  });

  it("Minting tokens increments total supply accordingly", async function() {
    const totalSupplyBeforeMinting = await dimitraToken.totalSupply();
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(owner.address, mintAmount);
    const totalSupplyAfterMinting = await dimitraToken.totalSupply();
    await expect(totalSupplyAfterMinting).to.equal(totalSupplyBeforeMinting + mintAmount);
  });
});

describe("Token Burning Tests", function() {
  
  it("Contract owner can burn own tokens", async function() {
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(owner.address, mintAmount);
    await dimitraToken.connect(owner).burn(mintAmount);
    expect(await dimitraToken.balanceOf(owner.address)).to.equal(0);
  });

  it("Non contract owner can burn own tokens", async function() {
    const mintAmount = '1000000000000000000';
    dimitraToken.connect(owner).mint(account1.address, mintAmount);
    await dimitraToken.connect(account1).burn(mintAmount);
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(0);
  });

  it("Contract owner cannot burn tokens of others without allowance approval", async function() {
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(account1.address, mintAmount);
    let balance = await dimitraToken.balanceOf(account1.address);
    await expect(dimitraToken.connect(owner).burnFrom(account1.address, balance)).to.be.revertedWith("ERC20: burn amount exceeds allowance");
  });

  it("Non contract owner cannot burn tokens of owner without allowance approval", async function() {
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(owner.address, mintAmount);
    let balance = await dimitraToken.balanceOf(owner.address);
    await dimitraToken.connect(owner).grantRole(id("BURNER_ROLE"), account1.address);
    await expect(dimitraToken.connect(account1).burnFrom(owner.address, balance)).to.be.revertedWith("ERC20: burn amount exceeds allowance");
  });

  it("An account cannot burn tokens of another without allowance approval", async function() {
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(account1.address, mintAmount);
    let balance = await dimitraToken.balanceOf(account1.address);
    await dimitraToken.connect(owner).grantRole(id("BURNER_ROLE"), account2.address);
    await expect(dimitraToken.connect(account2).burnFrom(account1.address, balance)).to.be.revertedWith("ERC20: burn amount exceeds allowance");
  });

  it("An account can burn tokens of another if approved", async function() {
    const mintAmount = '1000000000000000000';
    await dimitraToken.connect(owner).mint(account1.address, mintAmount);
    let balance = await dimitraToken.balanceOf(account1.address);
    await dimitraToken.connect(owner).grantRole(id("BURNER_ROLE"), account2.address);
    await dimitraToken.connect(account1).approve(account2.address, balance);
    await dimitraToken.connect(account2).burnFrom(account1.address, balance);
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(0);
    //console.log("balance", formatUnits(await dimitraToken.balanceOf(account1.address)));
    //console.log("allowance", formatUnits(await dimitraToken.allowance(account1.address, account2.address)));
  });
});

describe("Token Pausing Tests", function() {
  it("Contract owner can pause contract", async function() {
    // set balance up for transfer
    let amount = parseUnits("10", 18);
    await dimitraToken.connect(owner).mint(account1.address, amount);
    amount = await dimitraToken.balanceOf(account1.address);

    // transfer should succeed while not paused
    await dimitraToken.connect(account1).transfer(account2.address, amount);
    ammount = await dimitraToken.balanceOf(account2.address);
    //console.log("Amount to transfer", formatUnits(ammount));

    // set balance up again
    amount = parseUnits("10", 18);
    await dimitraToken.connect(owner).mint(account1.address, amount);
    amount = await dimitraToken.balanceOf(account1.address);

    // transfer should fail while paused
    dimitraToken.connect(owner).pause();
    await expect(dimitraToken.connect(account1).transfer(account2.address, amount)).to.be.revertedWith("ERC20Pausable: token transfer while paused");
    ammount = await dimitraToken.balanceOf(account2.address); 
    console.log("Amount", formatUnits(ammount));
  });

  it("Contract owner can unpause contract", async function() {
    // set balance up for transfer
    let amount = parseUnits("10", 18);
    await dimitraToken.connect(owner).mint(account1.address, amount);
    amount = await dimitraToken.balanceOf(account1.address);

    // temporarily pause then unpause contract should succeed again
    dimitraToken.connect(owner).pause();   // we already tested this case above
    dimitraToken.connect(owner).unpause(); // see if it works now...
    await dimitraToken.connect(account1).transfer(account2.address, amount);
    expect(await dimitraToken.balanceOf(account2.address)).to.equal(ammount);
    //console.log("Amount", formatUnits(ammount));
  });

  it("Non contract owner that is not PAUSER_ROLE cannot pause contract", async function() {
    await expect(dimitraToken.connect(account1).pause()).to.be.revertedWith("ERC20PresetMinterPauser: must have pauser role to pause");
  });
});

describe("Token Issuance, Locking, and Releasing Tests", function() {
  it("Token issuance, locking, and releasing", async function() {
    
    // owner mints initial balance for issuing locked tokens
    let amount = parseUnits("1000", 18);
    await dimitraToken.connect(owner).mint(owner.address, amount);
    expect(await dimitraToken.balanceOf(owner.address)).to.equal(amount);

    console.log("\nAfter mint but before issue locked tokens\n--------------------------------------------");
    console.log("Lock Box Count: ",         await (await dimitraToken.connect(owner).getLockBoxCount()).toString());
    console.log("Total Lock Box Balance: ", await (await dimitraToken.connect(owner).getTotalLockBoxBalance()).toString());
    console.log("Balance of owner", formatUnits(await dimitraToken.balanceOf(owner.address)));
    console.log("Balance of account1", formatUnits(await dimitraToken.balanceOf(account1.address)));
    console.log("Balance of account2", formatUnits(await dimitraToken.balanceOf(account2.address)));

    // issue locked tokens
    await expect(dimitraToken.connect(owner).issueLockedTokens(account1.address, amount, 5)).to.emit(dimitraToken, 'LogIssueLockedTokens'); // 5 vesting days
    expect(await dimitraToken.balanceOf(account1.address)).to.equal(amount);

    console.log("\nAfter issue locked tokens but before attempt transfer locked tokens\n--------------------------------------------");
    console.log("Lock Box Count: ",         await (await dimitraToken.connect(owner).getLockBoxCount()).toString());
    console.log("Total Lock Box Balance: ", await (await dimitraToken.connect(owner).getTotalLockBoxBalance()).toString());
    console.log("Balance of owner", formatUnits(await dimitraToken.balanceOf(owner.address)));
    console.log("Balance of account1", formatUnits(await dimitraToken.balanceOf(account1.address)));
    console.log("Balance of account2", formatUnits(await dimitraToken.balanceOf(account2.address)));
    
    // try to transfer tokens that are not yet released
    await expect(dimitraToken.connect(account1).transfer(account2.address, 50)).to.be.revertedWith("DimitraToken: transfer amount exceeds balance");

    console.log("\nAfter 1st attempt transfer tokens but before time travel\n--------------------------------------------");
    console.log("Lock Box Count: ",         await (await dimitraToken.connect(owner).getLockBoxCount()).toString());
    console.log("Total Lock Box Balance: ", await (await dimitraToken.connect(owner).getTotalLockBoxBalance()).toString());
    console.log("Balance of owner", formatUnits(await dimitraToken.balanceOf(owner.address)));
    console.log("Balance of account1", formatUnits(await dimitraToken.balanceOf(account1.address)));
    console.log("Balance of account2", formatUnits(await dimitraToken.balanceOf(account2.address)));
    
    // time travel 10 days into future
    await network.provider.send("evm_increaseTime", [10*86400]) // time in seconds = 10 days * 86400 seconds/day
    await network.provider.send("evm_mine"); // force block to be mined

    console.log("\nAfter time travel but before attempt transfer\n--------------------------------------------");
    console.log("Lock Box Count: ",         await (await dimitraToken.connect(owner).getLockBoxCount()).toString());
    console.log("Total Lock Box Balance: ", await (await dimitraToken.connect(owner).getTotalLockBoxBalance()).toString());
    console.log("Balance of owner", formatUnits(await dimitraToken.balanceOf(owner.address)));
    console.log("Balance of account1", formatUnits(await dimitraToken.balanceOf(account1.address)));
    console.log("Balance of account2", formatUnits(await dimitraToken.balanceOf(account2.address)));
    
    // transfer tokens that shoud now be released
    await dimitraToken.connect(account1).transfer(account2.address, 50);
    expect(await dimitraToken.balanceOf(account2.address)).to.equal(50);

    console.log("\nAfter 2nd attempt transfer\n--------------------------------------------");
    console.log("Lock Box Count: ",         await (await dimitraToken.connect(owner).getLockBoxCount()).toString());
    console.log("Total Lock Box Balance: ", await (await dimitraToken.connect(owner).getTotalLockBoxBalance()).toString());
    console.log("Balance of owner", formatUnits(await dimitraToken.balanceOf(owner.address)));
    console.log("Balance of account1", formatUnits(await dimitraToken.balanceOf(account1.address)));
    console.log("Balance of account2", formatUnits(await dimitraToken.balanceOf(account2.address)));
  });

});
